#!/usr/bin/env bash
# Como opc con sudo. Clona/actualiza el repo, build y systemd portal-next.
# Requiere /opt/portal-next/.env ya escrito (secretos pegados por la persona).

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

need_root
refuse_current_portal

APP_GIT_URL="${APP_GIT_URL:-https://github.com/monse-po/portal-empleados.git}"
APP_BRANCH="${APP_BRANCH:-cursor/integracion-portal}"
ENV_FILE="${PORTAL_HOME}/.env"

[[ -f "${ENV_FILE}" ]] || abort "falta ${ENV_FILE} — copia env.example y pega secretos"

if [[ ! -d "${PORTAL_HOME}/.git" ]]; then
  echo "==> Clone ${APP_GIT_URL} (${APP_BRANCH})"
  rm -rf "${PORTAL_HOME:?}/app-tmp"
  git clone --branch "${APP_BRANCH}" --single-branch "${APP_GIT_URL}" "${PORTAL_HOME}/app-tmp"
  # Preservar .env
  mv "${ENV_FILE}" /tmp/portal-next.env.$$
  find "${PORTAL_HOME}" -mindepth 1 -maxdepth 1 ! -name app-tmp -exec rm -rf {} +
  shopt -s dotglob
  mv "${PORTAL_HOME}/app-tmp/"* "${PORTAL_HOME}/"
  rmdir "${PORTAL_HOME}/app-tmp"
  mv /tmp/portal-next.env.$$ "${ENV_FILE}"
else
  echo "==> Pull ${APP_BRANCH}"
  git -C "${PORTAL_HOME}" fetch origin "${APP_BRANCH}"
  git -C "${PORTAL_HOME}" checkout "${APP_BRANCH}"
  git -C "${PORTAL_HOME}" pull --ff-only origin "${APP_BRANCH}"
fi

chown -R "${PORTAL_USER}:${PORTAL_USER}" "${PORTAL_HOME}"
chmod 600 "${ENV_FILE}"

echo "==> npm ci + prisma migrate + next build"
# NODE_ENV=production en .env haría que npm ci omita devDependencies
# (Tailwind/PostCSS) y el build falle. Forzar include=dev en el install.
sudo -u "${PORTAL_USER}" -H bash -lc "
  set -euo pipefail
  cd '${PORTAL_HOME}'
  set -a
  source '${ENV_FILE}'
  set +a
  export NODE_OPTIONS='--max-old-space-size=3072'
  NODE_ENV=development npm ci --include=dev
  npx prisma migrate deploy
  npx prisma generate
  NODE_ENV=production npm run build
"

install -m 644 "${SCRIPT_DIR}/portal-next.service" /etc/systemd/system/portal-next.service
# Node path: NodeSource suele dejar /usr/bin/node
if [[ ! -x /usr/bin/node ]]; then
  NODE_BIN="$(command -v node)"
  sed -i "s|/usr/bin/node|${NODE_BIN}|" /etc/systemd/system/portal-next.service
fi

systemctl daemon-reload
systemctl enable --now portal-next
systemctl --no-pager --full status portal-next || true

echo "==> Health localhost:${APP_PORT}"
sleep 2
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "http://127.0.0.1:${APP_PORT}/" || true

echo "==> App desplegada. Siguiente: túnel Cloudflare (./04-cloudflared.sh)"
