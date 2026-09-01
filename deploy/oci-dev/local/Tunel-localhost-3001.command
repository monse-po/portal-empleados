#!/bin/bash
# DOBLE CLIC → túnel SSH: localhost:3001 en tu Mac = portal de la VM DEV.
# Útil si IFS aún redirige a localhost. Prefiere siempre:
#   https://hmv-empleados-dev.nubeportal.com/login

set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/bin:$HOME/lib/oracle-cli/bin:/usr/local/bin:$PATH"

echo "========================================"
echo " Túnel localhost:3001 → vm-portal-dev"
echo "========================================"
echo
echo "Deja esta ventana ABIERTA mientras pruebas."
echo "URL pública (preferida):"
echo "  https://hmv-empleados-dev.nubeportal.com/login"
echo "Si el navegador cae en localhost:3001, con el túnel también funcionará."
echo

chmod +x ./deploy-via-bastion.sh 2>/dev/null || true
./deploy-via-bastion.sh tunnel
echo
read -r -p "Enter para cerrar…"
