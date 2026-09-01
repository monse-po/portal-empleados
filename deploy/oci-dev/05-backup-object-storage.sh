#!/usr/bin/env bash
# pg_dump local + subida a Object Storage (OCI CLI / instance principal).
# Variables en /etc/portal-next/backup.env (lo escribe la persona, chmod 600).

set -euo pipefail

BACKUP_ENV="${BACKUP_ENV:-/etc/portal-next/backup.env}"
if [[ -f "${BACKUP_ENV}" ]]; then
  # shellcheck disable=SC1090
  source "${BACKUP_ENV}"
fi

DB_NAME="${DB_NAME:-portal_hmv_dev}"
DB_USER="${DB_USER:-portal_app}"
DUMP_DIR="${DUMP_DIR:-/var/backups/portal-next}"
KEEP_DAYS="${KEEP_DAYS:-14}"
BUCKET="${OCI_BACKUP_BUCKET:-}"
NAMESPACE="${OCI_NAMESPACE:-}"
PREFIX="${OCI_BACKUP_PREFIX:-portal-hmv-dev}"

mkdir -p "${DUMP_DIR}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${DUMP_DIR}/${DB_NAME}_${STAMP}.dump"

PGPASSWORD="${PGPASSWORD:-}" pg_dump \
  -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}" \
  -Fc -f "${FILE}"

echo "dump ${FILE} ($(du -h "${FILE}" | awk '{print $1}'))"

if [[ -n "${BUCKET}" ]] && command -v oci >/dev/null 2>&1; then
  OBJECT="${PREFIX}/${DB_NAME}_${STAMP}.dump"
  ARGS=(os object put --bucket-name "${BUCKET}" --file "${FILE}" --name "${OBJECT}" --auth instance_principal)
  if [[ -n "${NAMESPACE}" ]]; then
    ARGS+=(--namespace "${NAMESPACE}")
  fi
  oci "${ARGS[@]}"
  echo "subido a ${BUCKET}/${OBJECT}"
else
  echo "sin OCI CLI o sin OCI_BACKUP_BUCKET — dump queda solo local"
fi

find "${DUMP_DIR}" -name "${DB_NAME}_*.dump" -mtime "+${KEEP_DAYS}" -delete
