# Doble clic → OCI DEV (sin Create session en la web)

La VM no tiene IP pública. El Bastion **sigue existiendo**, pero **tú no lo creas a mano**: el script lo abre por API, despliega y lo cierra.

## Una sola vez

1. Doble clic en **`1-setup-una-vez.command`**
2. Instala OCI CLI si falta
3. Configura API key (`oci setup config`) — región `sa-bogota-1`
4. Pega 3 OCIDs: compartment, bastion, instance

## Cada deploy (para siempre)

Doble clic en **`Desplegar-OCI-DEV.command`**  
(también hay copia en el Escritorio)

Opcional: **`Conectar-OCI-DEV.command`** solo abre SSH.

## Archivos

| Archivo | Rol |
|---------|-----|
| `1-setup-una-vez.command` | Setup |
| `Desplegar-OCI-DEV.command` | Deploy |
| `Conectar-OCI-DEV.command` | SSH |
| `oci-dev.env` | Tus OCIDs (no va a git) |
| `deploy-via-bastion.sh` | Motor |
