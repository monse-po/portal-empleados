# OCI DEV — `vm-portal-dev`

Ambiente DEV del portal nuevo (Next.js) en la VM ARM de Bogotá.  
**No toca** el portal actual (`157.137.235.142` / `hmv-empleados.nubeportal.com`).

Promoción DEV → TEST → PROD = mismo código, otro `.env` (`IFS_SYSTEM_URL`, `IFS_REALM`, `DATABASE_URL`, hostname).

## Qué no hace este kit

- No entra al Bastion (hace falta tu llave + tu IP en la allow list).
- No pega secretos. Eso lo hace la persona de configs en la VM / Vault / OneNote.
- No crea el túnel en el dashboard de Cloudflare (solo instala `cloudflared` con el token).
- No da de baja ni apaga nada.

## Datos fijos (ya tomados)

| | |
|---|---|
| VM | `vm-portal-dev` · `12.0.7.94` · sin IP pública |
| Acceso | Bastion `bastion_portal_dev` · usuario `opc` |
| App | usuario `portalnext` · systemd `portal-next` · `127.0.0.1:3001` |
| Postgres | 16 · `portal_hmv_dev` · `portal_app` · solo localhost |
| URL | `https://hmv-empleados-dev.nubeportal.com` |
| IFS | Keycloak realm, **no IDCS**. M2M `PORTAL_HMV_M2M`. Compañía `HMVINGCO`. |
| Auth empleado | apagado hasta Entra ID de HMV |

## Antes de entrar a la VM

La persona de Bastion necesita:

1. Tu llave pública: `ssh-keygen -y -f ~/.ssh/<llave>`
2. Tu IP pública: `curl ifconfig.me` (en Windows PowerShell: `curl.exe ifconfig.me`)

Y de configs (en Vault / OneNote, **no por chat**):

- Secret de `PORTAL_HMV_M2M` en el tenant **DEV** (confirmar que el client existe ahí; la nota lo nombra en `hmvtest`)
- Hostname/realm DEV si no es `hmvdev` / `https://hmvdev.ifs360.cloud`
- Token del túnel Cloudflare (se genera en el dashboard)
- Contraseña de `portal_app` (la definen al correr el script 02)

Confirmar también: repo GitHub `monse-po/portal-empleados` alcanzable desde la VM (público, deploy key, o copiar el árbol por Bastion).

## Orden en la VM

Sesión Bastion → SSH a `opc@12.0.7.94`. Copiar esta carpeta (`deploy/oci-dev`) a la VM.

```bash
cd deploy/oci-dev
chmod +x *.sh
sudo ./01-bootstrap-stack.sh
sudo ./02-setup-postgres.sh          # pide password de portal_app
sudo -u portalnext install -m 600 /dev/null /opt/portal-next/.env
sudo -u portalnext nano /opt/portal-next/.env   # copiar env.example + secretos
sudo ./03-deploy-app.sh              # clone, migrate, build, systemd
sudo ./04-cloudflared.sh             # pide token del túnel
```

Health local (sin Cloudflare):

```bash
curl -I http://127.0.0.1:3001/
sudo systemctl status portal-next
```

Público: `https://hmv-empleados-dev.nubeportal.com`  
Un 521 de Cloudflare = origen/túnel caído, no la app.

## Respaldo

Crear bucket de Object Storage en compartment `Portal_Empleados` (tags: Cliente, Ambiente, Proyecto, Owner, CentroCosto). Luego:

`/etc/portal-next/backup.env` (chmod 600):

```bash
PGPASSWORD=...
OCI_BACKUP_BUCKET=...
OCI_NAMESPACE=...
```

Cron (diario 03:15 UTC):

```
15 3 * * * /opt/portal-next/deploy/oci-dev/05-backup-object-storage.sh >> /var/log/portal-next-backup.log 2>&1
```

La VM necesita policy de instance principal `objectstorage` sobre ese bucket, o `oci` configurado. Sin eso el dump queda en `/var/backups/portal-next`.

## IFS en este ambiente

- **Auth:** Keycloak del tenant IFS, no el IDCS de la tenancy OCI (`idcs-2563e239…`).
- **No** definir `IFS_IDCS_DOMAIN_URL` / `IFS_IDCS_*`.
- Sí: `IFS_USE_REALM_OAUTH=true`, `IFS_SYSTEM_URL`, `IFS_REALM`, client M2M.
- Login de empleado (`IFS_AUTH_ENABLED`) se enciende cuando HMV entregue Entra + redirect URI a `https://hmv-empleados-dev.nubeportal.com/api/auth/callback/ifs`.
- La IP interna de IFS `12.0.2.235` es alcanzable por DRG; el hostname público `*.ifs360.cloud` sale por NAT. El `.env` usa hostname; no hace falta el IP interno.

## Rama

`03-deploy-app.sh` usa `cursor/integracion-portal` por defecto. Override:

```bash
sudo APP_BRANCH=main ./03-deploy-app.sh
```

No hacer `npm run db:seed` en este ambiente (mocks). Prisma solo aplica migraciones; catálogos y tiempo viven en IFS.
