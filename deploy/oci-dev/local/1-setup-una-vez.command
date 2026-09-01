#!/bin/bash
# UNA VEZ: instala OCI CLI (si falta), ayuda a armar oci-dev.env con los OCIDs.
# Doble clic en Finder → se abre Terminal.

set -euo pipefail
cd "$(dirname "$0")"
# El installer de Oracle deja oci aquí (a menudo fuera del PATH del .command)
export PATH="$HOME/bin:$HOME/lib/oracle-cli/bin:/usr/local/bin:$PATH"
hash -r

echo "========================================"
echo " Setup OCI DEV (una sola vez)"
echo "========================================"
echo

if command -v oci >/dev/null 2>&1; then
  echo "OCI CLI ya está instalado: $(oci --version 2>/dev/null | head -1)"
else
  echo "OCI CLI no está instalado. Instalando…"
  # Si quedó un venv a medias, lo quitamos para que el installer pueda continuar
  if [[ -d "$HOME/lib/oracle-cli" ]] && ! [[ -x "$HOME/bin/oci" || -x "$HOME/lib/oracle-cli/bin/oci" ]]; then
    echo "Limpiando instalación incompleta en ~/lib/oracle-cli…"
    rm -rf "$HOME/lib/oracle-cli"
  fi
  if [[ -d "$HOME/lib/oracle-cli" ]]; then
    echo "Hay restos en ~/lib/oracle-cli pero sin binario usable."
    echo "Borramolo y reinstalamos."
    rm -rf "$HOME/lib/oracle-cli" "$HOME/bin/oci" 2>/dev/null || true
  fi
  bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)" -- --accept-all-defaults
  export PATH="$HOME/bin:$HOME/lib/oracle-cli/bin:/usr/local/bin:$PATH"
  hash -r
fi

if ! command -v oci >/dev/null 2>&1; then
  echo "ERROR: sigue sin aparecer 'oci'."
  echo "Prueba en Terminal:  ~/bin/oci --version"
  read -r -p "Enter para cerrar…"
  exit 1
fi

echo "OCI CLI: $(oci --version 2>/dev/null | head -1)"
echo

if [[ ! -f "$HOME/.oci/config" ]]; then
  echo "No hay ~/.oci/config."
  echo
  echo "Necesitas esto de OCI (Identity → Domains/Users → tu usuario → API Keys):"
  echo "  1) Create API key → Download private key (.pem)"
  echo "  2) Anota: user OCID, tenancy OCID, fingerprint"
  echo "  3) Región: sa-bogota-1"
  echo
  echo "Guarda la .pem p.ej. en:  ~/.oci/oci_api_key.pem"
  echo "Luego este asistente te pregunta los datos."
  echo
  mkdir -p "$HOME/.oci"
  oci setup config
fi

if [[ ! -f ./oci-dev.env ]]; then
  cp ./oci-dev.env.example ./oci-dev.env
  echo "Creé oci-dev.env desde el example."
fi

echo
echo "Ahora pega los OCIDs (los ves en la consola OCI → cada recurso → Copy OCID):"
echo "  1) Compartment Portal_Empleados"
echo "  2) Bastion bastion_portal_dev"
echo "  3) Instance vm-portal-dev"
echo
read -r -p "Compartment OCID: " COMP
read -r -p "Bastion OCID: " BAST
read -r -p "Instance OCID: " INST

# macOS sed -i needs ''
sed -i '' "s|^OCI_COMPARTMENT_OCID=.*|OCI_COMPARTMENT_OCID=${COMP}|" oci-dev.env
sed -i '' "s|^OCI_BASTION_OCID=.*|OCI_BASTION_OCID=${BAST}|" oci-dev.env
sed -i '' "s|^OCI_INSTANCE_OCID=.*|OCI_INSTANCE_OCID=${INST}|" oci-dev.env

echo
echo "Probando listar el Bastion…"
# shellcheck disable=SC1091
set -a; source ./oci-dev.env; set +a
oci bastion bastion get --bastion-id "${OCI_BASTION_OCID}" --region "${OCI_REGION}" \
  --query 'data."name"' --raw-output

echo
echo "OK. A partir de ahora: doble clic en Desplegar-OCI-DEV.command"
echo "(en el Escritorio o en esta carpeta)."
read -r -p "Enter para cerrar…"
