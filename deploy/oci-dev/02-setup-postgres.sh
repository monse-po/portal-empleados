#!/usr/bin/env bash
# Como opc con sudo. Postgres 16 en localhost, DB portal_hmv_dev, user portal_app.
# La contraseña se pide por prompt — no va en chat ni en git.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

need_root
refuse_current_portal

DB_NAME="${DB_NAME:-portal_hmv_dev}"
DB_USER="${DB_USER:-portal_app}"

if ! command -v psql >/dev/null 2>&1 && [[ ! -x /usr/pgsql-16/bin/psql ]]; then
  echo "==> PostgreSQL 16 (PGDG EL9 aarch64)"
  dnf -y install https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-aarch64/pgdg-redhat-repo-latest.noarch.rpm
  dnf -qy module disable postgresql || true
  dnf -y install postgresql16-server postgresql16
fi

PG_SETUP=""
for c in /usr/pgsql-16/bin/postgresql-16-setup /usr/bin/postgresql-16-setup; do
  if [[ -x "$c" ]]; then
    PG_SETUP="$c"
    break
  fi
done

if [[ ! -d /var/lib/pgsql/16/data/base ]] && [[ ! -d /var/lib/pgsql/data/base ]]; then
  echo "==> initdb"
  if [[ -n "${PG_SETUP}" ]]; then
    "${PG_SETUP}" initdb
  else
    postgresql-setup --initdb
  fi
fi

systemctl enable --now postgresql-16 2>/dev/null || systemctl enable --now postgresql

PG_HBA=""
for f in /var/lib/pgsql/16/data/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf; do
  if [[ -f "$f" ]]; then
    PG_HBA="$f"
    break
  fi
done
[[ -n "${PG_HBA}" ]] || abort "no se encontró pg_hba.conf"

PG_CONF="$(dirname "${PG_HBA}")/postgresql.conf"
if grep -q "^listen_addresses" "${PG_CONF}"; then
  sed -i "s/^listen_addresses.*/listen_addresses = 'localhost'/" "${PG_CONF}"
else
  echo "listen_addresses = 'localhost'" >> "${PG_CONF}"
fi

# Solo socket local + 127.0.0.1
if ! grep -q "portal_app" "${PG_HBA}"; then
  cat >> "${PG_HBA}" <<'EOF'

# portal-next — solo localhost
local   portal_hmv_dev   portal_app                     scram-sha-256
host    portal_hmv_dev   portal_app   127.0.0.1/32      scram-sha-256
host    portal_hmv_dev   portal_app   ::1/128           scram-sha-256
EOF
fi

systemctl restart postgresql-16 2>/dev/null || systemctl restart postgresql

if [[ -z "${PORTAL_DB_PASSWORD:-}" ]]; then
  echo
  echo "Escribe la contraseña de ${DB_USER} (no se muestra). La persona de configs la guarda en Vault/OneNote."
  read -r -s -p "Password: " PORTAL_DB_PASSWORD
  echo
  [[ -n "${PORTAL_DB_PASSWORD}" ]] || abort "password vacío"
fi

# Escapar comillas simples para SQL literal (la persona pega el password en la VM).
DB_PASSWORD_SQL="${PORTAL_DB_PASSWORD//\'/\'\'}"

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD_SQL}';
  ELSE
    ALTER ROLE ${DB_USER} PASSWORD '${DB_PASSWORD_SQL}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')
\gexec
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

echo "==> Postgres listo en 127.0.0.1:5432 / ${DB_NAME}"
echo "    Siguiente: copiar env.example → ${PORTAL_HOME}/.env (con esta password e IFS secret)"
echo "    Luego: sudo ./03-deploy-app.sh"
