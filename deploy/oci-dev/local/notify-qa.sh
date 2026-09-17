#!/usr/bin/env bash
# Avisa al espacio de Google Chat que OCI DEV ya está desplegado.
# Uso:
#   ./notify-qa.sh            # mensaje real (tras deploy)
#   ./notify-qa.sh --test     # ping de prueba
# Nunca tumba el deploy: sale 0 aunque el chat falle.

set +e
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/oci-dev.env"
MODE="${1:-notify}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

DEV_URL="${DEV_URL:-https://hmv-empleados-dev.nubeportal.com/login}"
APP_BRANCH="${APP_BRANCH:-cursor/ambiente-dev}"
OPERATOR="${PORTAL_OPERATOR_EMAIL:-alguien}"
SHA="${NOTIFY_SHA:-}"
SUBJECT="${NOTIFY_SUBJECT:-}"
LOG="${NOTIFY_LOG:-}"
NOW="$(date '+%Y-%m-%d %H:%M')"

info() { echo "==> $*"; }
warn() { echo "AVISO: $*" >&2; }

if [[ -z "${GOOGLE_CHAT_WEBHOOK_URL:-}" ]]; then
  info "Sin GOOGLE_CHAT_WEBHOOK_URL — no aviso al grupo."
  exit 0
fi

TITLE="DEV listo para probar"
[[ "${MODE}" == "--test" ]] && TITLE="Ping de prueba — aviso de deploy DEV"

TEXT="$(
  {
    echo "${TITLE}"
    echo
    echo "URL: ${DEV_URL}"
    echo "Rama: ${APP_BRANCH}"
    [[ -n "${SHA}" ]] && echo "Commit: ${SHA}${SUBJECT:+ — ${SUBJECT}}"
    echo "Quién: ${OPERATOR}"
    echo "Cuándo: ${NOW}"
    if [[ -n "${LOG}" ]]; then
      echo
      echo "Últimos commits:"
      echo "${LOG}"
    fi
  }
)"

payload="$(
  TEXT="${TEXT}" python3 - <<'PY'
import json, os
print(json.dumps({"text": os.environ["TEXT"]}, ensure_ascii=False))
PY
)" || {
  warn "no pude armar el JSON de Google Chat"
  exit 0
}

http="$(
  curl -sS -o /tmp/portal-notify-chat.body -w '%{http_code}' \
    -X POST \
    -H 'Content-Type: application/json; charset=UTF-8' \
    --data "${payload}" \
    --max-time 20 \
    "${GOOGLE_CHAT_WEBHOOK_URL}"
)"
if [[ "${http}" != "200" ]]; then
  warn "Google Chat HTTP ${http}: $(head -c 240 /tmp/portal-notify-chat.body 2>/dev/null)"
  exit 0
fi
info "Google Chat: mensaje enviado al espacio"
exit 0
