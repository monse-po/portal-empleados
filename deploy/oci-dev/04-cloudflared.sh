#!/usr/bin/env bash
# Como opc con sudo. Instala cloudflared ARM64 y el servicio con token del dashboard.
# No pedir el token por chat: la persona lo pega aquí en la VM.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

need_root
refuse_current_portal

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "==> cloudflared linux-arm64"
  TMP_RPM="$(mktemp --suffix=.rpm)"
  curl -fsSL -o "${TMP_RPM}" \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.rpm
  dnf -y install "${TMP_RPM}"
  rm -f "${TMP_RPM}"
fi

cloudflared --version

if [[ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
  echo
  echo "Pega el token del túnel (Cloudflare Zero Trust → Networks → Tunnels)."
  echo "Hostname esperado: hmv-empleados-dev.nubeportal.com → http://127.0.0.1:${APP_PORT}"
  read -r -s -p "Token: " CLOUDFLARE_TUNNEL_TOKEN
  echo
  [[ -n "${CLOUDFLARE_TUNNEL_TOKEN}" ]] || abort "token vacío"
fi

cloudflared service install "${CLOUDFLARE_TUNNEL_TOKEN}"
systemctl enable --now cloudflared
systemctl --no-pager --full status cloudflared || true

echo "==> Túnel instalado. DNS/CNAME lo confirma la persona en Cloudflare."
echo "    URL: https://hmv-empleados-dev.nubeportal.com"
