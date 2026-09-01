# Consola UAT — empleados y autorizadores

Andamiaje de pruebas. **No es autenticación.** En producción cada persona entra con su propio SSO.

## Para Monse (operador)

1. Tu correo (`monse@veyron.com.mx`) debe estar en `PORTAL_IMPERSONATION_OPERATORS` en el `.env` del servidor DEV.
2. Login IFS en `/login`.
3. Abre **`/consola`** (también en el menú de usuario → Consola UAT).
4. Da de alta correos internos:
   - **Empleado** → solicitar / reportar horas
   - **Autorizador** → aprobar / rechazar horas
   - **Ambos** → los dos
5. Pulsa **Entrar a solicitar** o **Entrar a autorizar**.
6. El portal actúa como esa persona (banner ámbar). **↩ Volver a mí** regresa a la consola.

### Ya sembrados

| Correo | Rol |
|--------|-----|
| `liz.lino@veyron.com.mx` | Empleado |
| `jcgarcia@h-mv.com` | Autorizador |

## Seguridad

- El `?u=` / “Entrar como” **no autentica**. Cuelga de tu sesión IFS de operador.
- Sin sesión de operador, se ignora.
- Sin fila activa en `PortalAcceso`, se ignora.
- La guardia está en el servidor (`src/server/portal-impersonation.ts`).

## Piezas

| Pieza | Dónde |
|-------|--------|
| Consola Monse | `/consola` |
| Tabla | `PortalAcceso` (+ `rol`) |
| Allowlist operador | `PORTAL_IMPERSONATION_OPERATORS` |
| API accesos | `/api/auth/accesos` |
| API impersonar | `/api/auth/impersonate` |
