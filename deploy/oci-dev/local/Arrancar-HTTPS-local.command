#!/bin/bash
# DOBLE CLIC → túnel + HTTPS local para que IFS pueda volver a https://localhost:3001
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/bin:$HOME/lib/oracle-cli/bin:/usr/local/bin:$PATH"

echo "========================================"
echo " 1) Túnel Bastion (puerto 13001)"
echo " 2) Proxy HTTPS → localhost:3001"
echo "========================================"
echo
echo "En IFS agrega TAMBIÉN este Redirect URI:"
echo "  https://localhost:3001/api/auth/callback/ifs"
echo "Y Root/Home URL:"
echo "  https://hmv-empleados-dev.nubeportal.com"
echo
chmod +x ./deploy-via-bastion.sh 2>/dev/null || true

# Túnel en background de esta misma sesión
./deploy-via-bastion.sh tunnel-http &
TUNNEL_PID=$!
cleanup() {
  kill "$TUNNEL_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "Esperando túnel…"
for i in $(seq 1 60); do
  if curl -sS -o /dev/null --max-time 2 "http://127.0.0.1:13001/login"; then
    echo "Túnel OK"
    break
  fi
  sleep 3
done

echo "Arrancando HTTPS en :3001…"
node ./https-localhost-proxy.mjs
