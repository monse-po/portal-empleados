#!/bin/bash
# DOBLE CLIC → sesión Bastion automática + shell SSH (sin consola web).

set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/bin:$HOME/lib/oracle-cli/bin:/usr/local/bin:$PATH"

echo "========================================"
echo " Conectar SSH → vm-portal-dev"
echo "========================================"
echo

if [[ ! -f ./oci-dev.env ]]; then
  echo "Falta setup. Corre primero: 1-setup-una-vez.command"
  read -r -p "Enter para cerrar…"
  exit 1
fi

chmod +x ./deploy-via-bastion.sh 2>/dev/null || true
./deploy-via-bastion.sh shell
