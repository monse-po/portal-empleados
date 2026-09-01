#!/bin/bash
# DOBLE CLIC → crea sesión Bastion sola, despliega a vm-portal-dev, cierra sesión.
# No uses la consola OCI para Create session.

set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/bin:$HOME/lib/oracle-cli/bin:/usr/local/bin:$PATH"

echo "========================================"
echo " Desplegar portal → OCI DEV"
echo "========================================"
echo

if [[ ! -f ./oci-dev.env ]]; then
  echo "Falta setup. Corre primero: 1-setup-una-vez.command"
  read -r -p "Enter para cerrar…"
  exit 1
fi

chmod +x ./deploy-via-bastion.sh 2>/dev/null || true
./deploy-via-bastion.sh deploy
echo
read -r -p "Enter para cerrar…"
