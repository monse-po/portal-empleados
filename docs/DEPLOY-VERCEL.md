# Desplegar portal en Vercel + Neon

La base de datos **ya está en Neon**. Este guide sube la **app Next.js** a una URL pública.

## Qué obtienes

| Antes | Después |
|-------|---------|
| Solo `localhost:3000` en tu Mac | URL tipo `https://portal-empleados-xxx.vercel.app` |
| Neon en la nube | Igual — la app en Vercel se conecta a la misma Neon |

**IFS:** no hace falta para el primer deploy. Deja `IFS_AUTH_ENABLED` sin definir.

---

## Paso 1 — Subir código a GitHub

Si el repo aún no está en GitHub:

1. Crea un repo vacío en GitHub (ej. `portal-empleados`).
2. En tu Mac:

```bash
cd portal-empleados
git add .
git commit -m "Preparar deploy Vercel + Neon"
git remote add origin https://github.com/TU_ORG/portal-empleados.git
git push -u origin main
```

(Sustituye `TU_ORG` por tu usuario u organización.)

---

## Paso 2 — Importar en Vercel

1. Entra a [vercel.com](https://vercel.com) → **Add New → Project**.
2. Importa el repo `portal-empleados`.
3. Framework: **Next.js** (auto-detectado).
4. **No** cambies el build command — `vercel.json` ya incluye migraciones Prisma.

---

## Paso 3 — Variables de entorno en Vercel

En **Project → Settings → Environment Variables**, agrega (copia desde tu `.env` de Neon):

| Variable | Obligatoria | Notas |
|----------|-------------|-------|
| `DATABASE_URL` | Sí | Connection string pooled de Neon |
| `DATABASE_URL_UNPOOLED` | Recomendada | Para migraciones si hace falta |

Opcional (IFS — más adelante):

| Variable | Cuándo |
|----------|--------|
| `IFS_AUTH_ENABLED` | Solo cuando login IFS esté listo |
| `IFS_OAUTH_*` | Ver `docs/PENDIENTE-IFS.md` |
| `IFS_SESSION_SECRET` | String aleatorio largo en producción |

**No** subas `.env.local` al repo.

---

## Paso 4 — Deploy

Clic **Deploy**. Vercel:

1. `npm install` → `postinstall` → `prisma generate`
2. `prisma migrate deploy` → aplica tablas en Neon
3. `next build` → publica la app

Al terminar tendrás una URL pública. Prueba `/hoja-tiempo`.

---

## Paso 5 — Seed (solo primera vez, opcional)

Si la BD Neon está vacía:

```bash
# En tu Mac, con DATABASE_URL apuntando a Neon:
npm run db:seed
```

O desde Neon SQL / Prisma Studio si prefieres.

---

## Cuando conectes IFS

Agrega en IAM Client **otra** Redirect URI:

```text
https://TU-PROYECTO.vercel.app/api/auth/callback/ifs
```

Y en Vercel:

```env
IFS_AUTH_ENABLED=true
IFS_OAUTH_REDIRECT_URI=https://TU-PROYECTO.vercel.app/api/auth/callback/ifs
```

Localhost y Vercel pueden convivir (dos Redirect URIs).

---

## Comandos útiles

```bash
# Deploy manual (si instalas Vercel CLI)
npx vercel

# Producción
npx vercel --prod
```

---

## Problemas frecuentes

| Error | Solución |
|-------|----------|
| Build falla en Prisma | Verifica `DATABASE_URL` en Vercel |
| Mi Tiempo vacío | Corre `npm run db:seed` contra Neon |
| Login IFS no funciona | Revisa Redirect URI exacta en IFS IAM |
