# Pendiente IFS — retomar cuando el ambiente responda

IFS DEV (`hmvdev`) estaba lento el 22-jul-2026. Volver a esto cuando cargue bien.

## Checklist (15 min)

- [ ] Abrir **Solution Manager → IAM Clients → `IFS_EMP_PORTAL_USER` → detalle**
- [ ] Buscar **Redirect URIs** (no salen en la tabla, solo en detalle)
- [ ] Agregar: `http://localhost:3000/api/auth/callback/ifs`
- [ ] Rotar **client secret** (quedó en captura de pantalla)
- [ ] Pegar en `.env.local`:

```env
IFS_AUTH_ENABLED=true
IFS_OAUTH_CLIENT_ID=IFS_EMP_PORTAL_USER
IFS_OAUTH_CLIENT_SECRET=<secret>
IFS_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback/ifs
IFS_USE_REALM_OAUTH=true
IFS_SESSION_SECRET=<string aleatorio largo>
```

- [ ] Probar: `npm run dev` → `/login` → Entrar con IFS
- [ ] Elegir email `@h-mv.com` que exista en `CEmpPortalUserSet`

## Mientras tanto

El portal corre **sin IFS** (mocks + Neon). No tocar APEX prod.
