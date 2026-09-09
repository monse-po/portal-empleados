# OCI PROD — `vm-portal-prod`

Portal nuevo (Next.js) en la VM PROD. **No reutiliza** realm, client, secret ni `redirect_uri` de DEV (`hmvtest`).

El código es el mismo. IAM y el `.env` de esta VM son otros.

## URL y callback

| | |
|---|---|
| Público (cutover) | `https://hmv-empleados.nubeportal.com` |
| Callback que IAM debe registrar | `https://hmv-empleados.nubeportal.com/api/auth/callback/ifs` |

Hasta el corte de DNS, el host actual puede seguir siendo el portal viejo. No despliegues encima sin coordinar Cloudflare.

## IAM (una vez, en el tenant IFS de **producción**)

1. Client `IFS_EMP_PORTAL_USER` del realm PROD (no el de `hmvtest`).
2. Secret de ese client → `IFS_OAUTH_CLIENT_SECRET` en el `.env` de la VM.
3. `redirect_uri` = la URL de callback de arriba (exacta).
4. Direct Access Grants en ese client, para el login correo+clave sin pantalla de IFS.

El deploy **no** crea el client ni pega el URI en IAM.

## `.env` en la VM

Copiar [`env.example`](./env.example). Completar `IFS_SYSTEM_URL`, `IFS_REALM`, secret y `IFS_SESSION_SECRET`. No pegar valores de DEV.

## Deploy desde la Mac

1. Copiar `local/oci-prod.env.example` → `local/oci-prod.env` (OCIDs, no se sube a git).
2. `./local/deploy-via-bastion.sh deploy`

Por defecto `APP_BRANCH` en el example local. Alinear la rama con lo que quieras en PROD (no empujar `hmvtest` en el `.env`).
