#!/usr/bin/env bash
# Como opc con sudo, en vm-portal-dev (Oracle Linux 9 ARM).
# Instala toolchain, Node 20, usuario portalnext y swap para el build.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

need_root
refuse_current_portal

echo "==> Oracle Linux $(uname -m) — Development Tools + python3"
dnf -y install oraclelinux-developer-release-el9 || true
dnf -y groupinstall "Development Tools"
dnf -y install python3 git curl tar gzip xz

if [[ ! -f /swapfile ]]; then
  echo "==> Swap 2G (build Next.js en 6 GB)"
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  echo "==> Node.js 20 (NodeSource, aarch64)"
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  dnf -y install nodejs
fi

node -v
npm -v

if ! id -u "${PORTAL_USER}" >/dev/null 2>&1; then
  echo "==> Usuario ${PORTAL_USER}"
  useradd --system --create-home --home-dir "${PORTAL_HOME}" --shell /sbin/nologin "${PORTAL_USER}"
fi

mkdir -p "${PORTAL_HOME}"
chown "${PORTAL_USER}:${PORTAL_USER}" "${PORTAL_HOME}"

echo "==> Bootstrap listo. Siguiente: sudo ./02-setup-postgres.sh"
