# Portal de Empleados — HMV

Portal empresarial de empleados: hoja de tiempo, anticipos y módulos futuros (Next.js 16 + Prisma + SQLite).

## Requisitos

- Node.js 20+
- npm

## Arranque rápido

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Abre [http://localhost:3000/hoja-tiempo](http://localhost:3000/hoja-tiempo).

## Base de datos (Mi Tiempo)

| Comando | Descripción |
|---------|-------------|
| `npm run db:migrate` | Aplica migraciones Prisma |
| `npm run db:seed` | Carga mocks de registros, proyectos y empleado sesión |
| `npm run db:studio` | Prisma Studio (explorar datos) |

- **Motor:** SQLite (`prisma/dev.db`)
- **Schema:** `prisma/schema.prisma` — `Empleado`, `Proyecto`, `RegistroTiempo`
- **Server actions:** `src/server/mi-tiempo-actions.ts`
- **Cliente:** `src/lib/db.ts`

Los catálogos (proyectos, jerarquía) siguen en mocks hasta integrar IFS. Los **registros de tiempo** persisten en BD.

## Módulos

| Ruta | Rol |
|------|-----|
| `/hoja-tiempo` | Empleado — Mi Tiempo |
| `/mis-anticipos` | Empleado — Anticipos |
| `/aprobacion-tiempo` | Gerente |
| `/aprobacion-anticipos` | Gerente |

Rol de prueba en `sessionStorage` (`hmv-usuario-rol`).

## Módulos y ramas Git

Ver **[docs/MODULES.md](./docs/MODULES.md)** — mapa de módulos, ramas `cursor/modulo-*`, flujo de merge a `main`.

| Rama | Alcance |
|------|---------|
| `main` | App completa integrada |
| `cursor/modulo-tiempo` | Hoja de tiempo + aprobación tiempo + BD |
| `cursor/modulo-anticipos` | Anticipos + aprobación anticipos |
| `cursor/shell-shared` | UI compartida, layout, design system |

## Build

```bash
npm run build
npm start
```

`postinstall` ejecuta `prisma generate` automáticamente.
