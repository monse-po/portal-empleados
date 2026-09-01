#!/usr/bin/env bash
# Utilidades compartidas. No ejecutar solo.

set -euo pipefail

PORTAL_USER="${PORTAL_USER:-portalnext}"
PORTAL_HOME="${PORTAL_HOME:-/opt/portal-next}"
APP_PORT="${APP_PORT:-3001}"

abort() {
  echo "ERROR: $*" >&2
  exit 1
}

need_root() {
  if [[ "$(id -u)" -ne 0 ]]; then
    abort "correr como root (sudo)"
  fi
}

refuse_current_portal() {
  if [[ -d /opt/portal/backend ]] || [[ -d /opt/portal/frontend ]]; then
    abort "parece el portal actual (/opt/portal). No tocar. Esta kit es solo para vm-portal-dev"
  fi
}

is_aarch64() {
  [[ "$(uname -m)" == "aarch64" ]]
}
