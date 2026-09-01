#!/usr/bin/env bash
# Crea sesión Bastion por API (OCI CLI), despliega o abre SSH, y borra la sesión.
# Uso:
#   ./deploy-via-bastion.sh deploy
#   ./deploy-via-bastion.sh restart
#   ./deploy-via-bastion.sh shell
# No hace falta Create session en la consola web.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/oci-dev.env"
MODE="${1:-deploy}"

die() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "==> $*"; }

[[ -f "${ENV_FILE}" ]] || die "Falta ${ENV_FILE}
Copia oci-dev.env.example → oci-dev.env y llena los OCIDs (una sola vez).
O corre: 1-setup-una-vez.command"

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

# Expandir $HOME en rutas del env
OCI_SSH_KEY="${OCI_SSH_KEY/#\~/$HOME}"
OCI_SSH_PUB="${OCI_SSH_PUB/#\~/$HOME}"
OCI_SSH_KEY="${OCI_SSH_KEY/\$HOME/$HOME}"
OCI_SSH_PUB="${OCI_SSH_PUB/\$HOME/$HOME}"

command -v oci >/dev/null 2>&1 || die "OCI CLI no está instalado. Corre 1-setup-una-vez.command"
[[ -f "${OCI_SSH_KEY}" ]] || die "Falta llave privada: ${OCI_SSH_KEY}"
[[ -f "${OCI_SSH_PUB}" ]] || die "Falta llave pública: ${OCI_SSH_PUB}"
[[ "${OCI_BASTION_OCID}" == ocid1.bastion.* ]] || die "OCI_BASTION_OCID inválido en oci-dev.env"
[[ "${OCI_INSTANCE_OCID}" == ocid1.instance.* ]] || die "OCI_INSTANCE_OCID inválido en oci-dev.env"

SESSION_NAME="portal-dev-$(date +%Y%m%d%H%M%S)"
SESSION_OCID=""
CLEANED=0

# Asegurar que la IP pública actual está en el allowlist del Bastion
ensure_bastion_cidr() {
  local my_ip cidrs_json
  my_ip="$(curl -sS --max-time 8 ifconfig.me || true)"
  [[ "${my_ip}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
    info "No pude detectar IP pública; sigo sin tocar CIDR"
    return 0
  }
  cidrs_json="$(
    oci bastion bastion get \
      --bastion-id "${OCI_BASTION_OCID}" \
      --profile "${OCI_PROFILE}" \
      --region "${OCI_REGION}" \
      --query 'data."client-cidr-block-allow-list"' \
      --output json
  )"
  if echo "${cidrs_json}" | grep -q "\"${my_ip}/32\""; then
    info "IP ${my_ip} ya está en allowlist Bastion"
    return 0
  fi
  info "Agregando ${my_ip}/32 al allowlist Bastion…"
  local new_list
  new_list="$(
    python3 - <<PY
import json
cur = json.loads('''${cidrs_json}''')
ip = "${my_ip}/32"
if ip not in cur:
    cur.append(ip)
print(json.dumps(cur))
PY
  )"
  oci bastion bastion update \
    --bastion-id "${OCI_BASTION_OCID}" \
    --profile "${OCI_PROFILE}" \
    --region "${OCI_REGION}" \
    --client-cidr-list "${new_list}" \
    --force \
    --wait-for-state SUCCEEDED \
    --max-wait-seconds 120 >/dev/null
  info "Allowlist actualizado"
}

ensure_bastion_cidr

cleanup() {
  if [[ "${CLEANED}" -eq 1 ]]; then return; fi
  CLEANED=1
  if [[ -n "${SESSION_OCID}" ]]; then
    info "Cerrando sesión Bastion…"
    oci bastion session delete \
      --session-id "${SESSION_OCID}" \
      --profile "${OCI_PROFILE}" \
      --region "${OCI_REGION}" \
      --force >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

info "Creando sesión Bastion Managed SSH (${SESSION_NAME})…"
SESSION_OCID="$(
  oci bastion session create-managed-ssh \
    --bastion-id "${OCI_BASTION_OCID}" \
    --display-name "${SESSION_NAME}" \
    --ssh-public-key-file "${OCI_SSH_PUB}" \
    --target-resource-id "${OCI_INSTANCE_OCID}" \
    --target-os-username "${OCI_SSH_USER}" \
    --target-private-ip "${OCI_INSTANCE_IP}" \
    --session-ttl "${BASTION_SESSION_TTL}" \
    --profile "${OCI_PROFILE}" \
    --region "${OCI_REGION}" \
    --query 'data.id' \
    --raw-output
)"

[[ "${SESSION_OCID}" == ocid1.bastionsession.* ]] || die "No pude crear sesión (OCID vacío)"

info "Sesión: ${SESSION_OCID}"
info "Esperando estado ACTIVE…"
STATE=""
for _ in $(seq 1 60); do
  STATE="$(
    oci bastion session get \
      --session-id "${SESSION_OCID}" \
      --profile "${OCI_PROFILE}" \
      --region "${OCI_REGION}" \
      --query 'data."lifecycle-state"' \
      --raw-output 2>/dev/null || echo UNKNOWN
  )"
  echo "    estado: ${STATE}"
  [[ "${STATE}" == "ACTIVE" ]] && break
  [[ "${STATE}" == "DELETED" || "${STATE}" == "FAILED" ]] && die "Sesión en ${STATE}"
  sleep 3
done
[[ "${STATE}" == "ACTIVE" ]] || die "Timeout esperando ACTIVE"
# A veces ACTIVE llega un poco antes de que el endpoint acepte la llave
sleep 8

BASTION_HOST="host.bastion.${OCI_REGION}.oci.oraclecloud.com"
PROXY_CMD="ssh -i ${OCI_SSH_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30 -W %h:%p -p 22 ${SESSION_OCID}@${BASTION_HOST}"

ssh_vm() {
  ssh -i "${OCI_SSH_KEY}" \
    -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=30 \
    -o ServerAliveInterval=15 \
    -o "ProxyCommand=${PROXY_CMD}" \
    -p 22 \
    "${OCI_SSH_USER}@${OCI_INSTANCE_IP}" \
    "$@"
}

info "Probando SSH…"
ssh_vm 'echo CONNECTED; hostname; whoami'

if [[ "${MODE}" == "shell" ]]; then
  info "Abriendo shell interactivo (Ctrl+D para salir)…"
  ssh -i "${OCI_SSH_KEY}" \
    -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=accept-new \
    -o "ProxyCommand=${PROXY_CMD}" \
    -p 22 \
    "${OCI_SSH_USER}@${OCI_INSTANCE_IP}"
  exit 0
fi

if [[ "${MODE}" == "restart" ]]; then
  info "Reiniciando portal-next…"
  ssh_vm 'sudo systemctl restart portal-next; sleep 2; sudo systemctl --no-pager --full status portal-next | head -20; curl -sS -o /dev/null -w "local HTTP %{http_code}\n" http://127.0.0.1:3001/login || true'
  info "Listo → https://hmv-empleados-dev.nubeportal.com/login"
  exit 0
fi

info "Desplegando rama ${APP_BRANCH}…"
ssh_vm "export APP_HOME='${APP_HOME}' APP_BRANCH='${APP_BRANCH}' OP_EMAIL='${PORTAL_OPERATOR_EMAIL}'; bash -s" <<'REMOTE'
set -euo pipefail

# /opt/portal-next es de portalnext; opc entra con sudo
echo "--- git (${APP_BRANCH}) ---"
if ! sudo -u portalnext test -d "${APP_HOME}/.git"; then
  echo "No hay .git en ${APP_HOME}. Corre deploy/oci-dev/03-deploy-app.sh una vez."
  exit 1
fi
sudo -u portalnext -H bash -lc "
  set -euo pipefail
  cd '${APP_HOME}'
  # Deploy machine: alinear a GitHub. -f pisa cambios locales (p.ej. tsconfig).
  # .env no está en git → no se toca.
  git fetch origin '${APP_BRANCH}'
  git checkout -f -B '${APP_BRANCH}' FETCH_HEAD
"

echo "--- env operador (${OP_EMAIL}) ---"
ENVF="${APP_HOME}/.env"
sudo -u portalnext test -f "${ENVF}"
if sudo -u portalnext grep -q '^PORTAL_IMPERSONATION_OPERATORS=' "${ENVF}"; then
  sudo -u portalnext sed -i "s|^PORTAL_IMPERSONATION_OPERATORS=.*|PORTAL_IMPERSONATION_OPERATORS=${OP_EMAIL}|" "${ENVF}"
else
  echo "PORTAL_IMPERSONATION_OPERATORS=${OP_EMAIL}" | sudo -u portalnext tee -a "${ENVF}" >/dev/null
fi

echo "--- npm + migrate + build ---"
sudo -u portalnext -H bash -lc "
  set -euo pipefail
  cd '${APP_HOME}'
  set -a; source .env; set +a
  export NODE_OPTIONS='--max-old-space-size=3072'
  NODE_ENV=development npm ci --include=dev
  npx prisma migrate deploy
  npx prisma generate
  NODE_ENV=production npm run build
"

echo "--- restart portal-next ---"
sudo systemctl restart portal-next
sleep 2
sudo systemctl --no-pager --full status portal-next | head -20
curl -sS -o /dev/null -w 'local HTTP %{http_code}\n' http://127.0.0.1:3001/ || true
echo "DEPLOY OK"
REMOTE

info "Listo → https://hmv-empleados-dev.nubeportal.com/consola"
info "La sesión Bastion se cierra sola al terminar."
