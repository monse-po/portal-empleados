import type { IconName } from "@/src/components/ui/Icon";
import type { UsuarioRol } from "@/src/components/layout/RoleContext";

/**
 * Registro central de módulos del portal.
 *
 * Fuente de verdad para navegación, rutas por rol y el "Modo enfoque".
 * Al agregar un módulo nuevo basta con añadir una entrada aquí.
 */
export type ModuleId =
  | "tiempo"
  | "historico"
  | "anticipos"
  | "legalizaciones"
  | "documento-soporte";

export type ModuleRoute = {
  path: string;
  rol: UsuarioRol;
  navLabel: string;
  icon: IconName;
  /**
   * Si true, la ruta sigue existiendo (URL, FOCUS, deep link) pero
   * no aparece en sidebar / drawer. Útil para legacy a punto de sustituir.
   */
  navHidden?: boolean;
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
        path: "/aprobacion-tiempo-proyectos",
        rol: "gerente",
        navLabel: "Aprobar Tiempo",
        icon: "checkSquare",
      },
      /**
       * Legacy: bandeja plana por registro.
       * El flujo canónico es proyecto → empleado → registros
       * (`/aprobacion-tiempo-proyectos`). La ruta sigue viva; solo se oculta del menú.
       */
      {
        path: "/aprobacion-tiempo",
        rol: "gerente",
        navLabel: "Aprobar Tiempo (legacy)",
        icon: "list",
        navHidden: true,
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
  {
    id: "documento-soporte",
    label: "Documento de Soporte",
    routes: [
      {
        path: "/documento-soporte",
        rol: "empleado",
        navLabel: "Mis DSE",
        icon: "paperclip",
      },
    ],
  },
  {
    id: "historico",
    label: "Histórico",
    routes: [
      {
        path: "/historico-tiempo",
        rol: "empleado",
        navLabel: "Mi Histórico",
        icon: "history",
      },
    ],
  },
];

/**
 * Módulos enfocados vía variable de entorno.
 *
 *   npm run dev                      → Tiempo + Anticipos
 *   FOCUS=all npm run dev            → app completa
 *   FOCUS=tiempo npm run dev         → solo Tiempo
 *   FOCUS=tiempo,anticipos npm run dev
 *
 * `FOCUS` se mapea a NEXT_PUBLIC_FOCUS en next.config.
 */
export function getFocusModules(): ModuleId[] | null {
  const raw = process.env.NEXT_PUBLIC_FOCUS?.trim().toLowerCase();
  if (raw === "all" || raw === "off") return null;
  const tokens = (raw || "tiempo,anticipos")
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const matched = tokens.filter((id): id is ModuleId =>
    MODULES.some((m) => m.id === id),
  );
  return matched.length ? matched : null;
}

/** Un solo módulo enfocado, o null si no hay enfoque / hay varios. */
export function getFocusModule(): ModuleId | null {
  const ids = getFocusModules();
  if (!ids || ids.length !== 1) return null;
  return ids[0];
}

/** Módulos visibles según el enfoque activo (todos si no hay enfoque). */
export function getVisibleModules(): ModuleDef[] {
  const focus = getFocusModules();
  if (!focus) return MODULES;
  return MODULES.filter((m) => focus.includes(m.id));
}

/** Rutas de herramientas / auth: siempre accesibles aunque FOCUS=tiempo, etc. */
export function isUtilityPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dev") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/notificaciones") ||
    pathname === "/inicio" ||
    pathname.startsWith("/inicio/")
  );
}

/** ¿La ruta pertenece a un módulo visible con el enfoque actual? */
export function isPathVisible(pathname: string): boolean {
  if (isUtilityPath(pathname)) return true;
  return getVisibleModules().some((m) =>
    m.routes.some((r) => isNavRouteActive(pathname, r.path)),
  );
}

/** Activo exacto o subruta (`/foo/bar`), no un path que solo comparte prefijo (`/foo-otros`). */
export function isNavRouteActive(pathname: string, routePath: string): boolean {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}

/** Home para un rol respetando el enfoque activo. */
export function getHomePathForRole(rol: UsuarioRol): string {
  const visibles = getVisibleModules();

  for (const m of visibles) {
    const propia = m.routes.find((r) => r.rol === rol && !r.navHidden);
    if (propia) return propia.path;
  }
  for (const m of visibles) {
    const propia = m.routes.find((r) => r.rol === rol);
    if (propia) return propia.path;
  }
  const primera = visibles[0]?.routes.find((r) => !r.navHidden) ?? visibles[0]?.routes[0];
  return primera?.path ?? "/hoja-tiempo";
}
