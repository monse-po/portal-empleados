/** Textos de UI del módulo Mi Tiempo (no mock de datos). */
export const TIEMPO_UI_COPY = {
  approverFallback: "Según el proyecto",
  selectProject: "Seleccionar...",
  selectSubproject: "Seleccionar subproyecto...",
  selectActivity: "Seleccionar actividad...",
  selectProjectFirst: "Selecciona un proyecto primero",
  selectSubprojectFirst: "Selecciona un subproyecto primero",
  selectActivityFirst: "Elige actividad primero",
  selectHourType: "Seleccionar...",
  searchProject: "Buscar proyecto...",
  searchSubproject: "Buscar subproyecto...",
  searchActivity: "Buscar actividad...",
  estadoBorrador: "Borrador",
  estadoRegistrado: "Registrado",
  guardar: "Guardar",
  guardarCambios: "Guardar cambios",
  hintEnviarDesdeLista:
    "Para enviar al gerente, abre el detalle del día y usa el botón verde de envío.",
  hintEnviarEnVistaDia:
    "Después de guardar, usa Enviar a aprobación en la barra verde al final de la página.",
  listaAyuda: "Clic en la fecha → ver detalle del día · Clic en fila → editar",
  verDia: "Ver día",
  verDetalleDia: "Ver detalle del día",
  filaEditableHint: "Clic en fila para editar",
  diaBorradoresPendientes:
    "Cuando termines de registrar, envía a Aprobación.",
  toastRegistroGuardado: "Registro guardado",
  toastRegistroNuevo:
    "Registro guardado como borrador. Ábrelo desde el día para enviar a aprobación.",
  ifsCatalogError: {
    sessionExpired: (detail: string) =>
      `Tu sesión con IFS expiró (${detail}).`,
    sessionExpiredAction: "Vuelve a iniciar sesión",
    sessionExpiredSuffix: "con tu correo @h-mv.com para cargar proyectos reales.",
    fetchFailed: (detail: string) =>
      `No se pudo leer proyectos de IFS (${detail}). Mostrando catálogo demo.`,
    fetchFailedAction: "Revisa /dev/ifs",
    fetchFailedSuffix:
      "— si CEmpPortalUserSet y GetUserInfo están verdes, pide a TI proyectos asignados a tu empleado para esa fecha.",
  },
} as const;
