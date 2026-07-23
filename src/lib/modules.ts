import type { IconName } from "@/src/components/ui/Icon";
import type { UsuarioRol } from "@/src/components/layout/RoleContext";

/**
 * Registro central de módulos del portal.
 *
 * Fuente de verdad para navegación, rutas por rol y el "Modo enfoque".
 * Al agregar un módulo nuevo basta con añadir una entrada aquí.
 */
export type ModuleId = "tiempo" | "anticipos" | "legalizaciones";

export type ModuleRoute = {
  path: string;
  rol: UsuarioRol;
  navLabel: string;
  icon: IconName;
};

export type ModuleDef = {
  id: ModuleId;
  label: string;
  routes: ModuleRoute[];
};

export const MODULES: ModuleDef[] = [
  {
    id: "tiempo",
    label: "Tiempo",
    routes: [
      {
        path: "/hoja-tiempo",
        rol: "empleado",
        navLabel: "Mi Tiempo",
        icon: "clock",
      },
      {
        path: "/aprobacion-tiempo",
        rol: "gerente",
        navLabel: "Tiempo",
        icon: "checkSquare",
      },
    ],
  },
  {
    id: "anticipos",
    label: "Anticipos",
    routes: [
      {
        path: "/mis-anticipos",
        rol: "empleado",
        navLabel: "Mis Anticipos",
        icon: "wallet",
      },
      {
        path: "/aprobacion-anticipos",
        rol: "gerente",
        navLabel: "Anticipos",
        icon: "wallet",
      },
    ],
  },
  {
    id: "legalizaciones",
    label: "Legalizaciones",
    routes: [
      {
        path: "/legalizaciones",
        rol: "empleado",
        navLabel: "Mis Legalizaciones",
        icon: "folderOpen",
      },
      {
        path: "/aprobacion-legalizaciones",
        rol: "gerente",
        navLabel: "Legalizaciones",
        icon: "folderOpen",
      },
    ],
  },
];

/**
 * Módulo enfocado vía variable de entorno.
 *
 *   FOCUS=tiempo npm run dev   → solo el módulo Tiempo
 *   npm run dev                → app completa (sin enfoque)
 *
 * `FOCUS` se mapea a NEXT_PUBLIC_FOCUS en next.config para que esté
 * disponible también en componentes de cliente.
 */
export function getFocusModule(): ModuleId | null {
  const raw = process.env.NEXT_PUBLIC_FOCUS?.trim().toLowerCase();
  if (!raw) return null;
  const match = MODULES.find((m) => m.id === raw);
  return match ? match.id : null;
}

/** Módulos visibles según el enfoque activo (todos si no hay enfoque). */
export function getVisibleModules(): ModuleDef[] {
  const focus = getFocusModule();
  if (!focus) return MODULES;
  return MODULES.filter((m) => m.id === focus);
}

/** Rutas de herramientas / auth: siempre accesibles aunque FOCUS=tiempo, etc. */
export function isUtilityPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dev") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth")
  );
}

/** ¿La ruta pertenece a un módulo visible con el enfoque actual? */
export function isPathVisible(pathname: string): boolean {
  if (isUtilityPath(pathname)) return true;
  return getVisibleModules().some((m) =>
    m.routes.some((r) => pathname.startsWith(r.path)),
  );
}

/** Home para un rol respetando el enfoque activo. */
export function getHomePathForRole(rol: UsuarioRol): string {
  const visibles = getVisibleModules();

  for (const m of visibles) {
    const propia = m.routes.find((r) => r.rol === rol);
    if (propia) return propia.path;
  }
  const primera = visibles[0]?.routes[0];
  return primera?.path ?? "/hoja-tiempo";
}
