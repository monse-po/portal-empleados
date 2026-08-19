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
  tipoHoraProgramaHint: "Los tipos disponibles dependen de tu programa de trabajo.",
  searchProject: "Buscar proyecto...",
  searchSubproject: "Buscar subproyecto...",
  searchActivity: "Buscar actividad...",
  estadoBorrador: "Borrador",
  estadoRegistrado: "Lanzado",
  estadoLanzado: "Lanzado",
  guardar: "Guardar",
  guardarCambios: "Guardar cambios",
  hintEnviarDesdeLista:
    "Con un solo proyecto estable: registra el rango y usa «Guardar y enviar». Si cambias de proyecto por día, envía desde el detalle del día.",
  hintEnviarEnVistaDia:
    "Después de guardar, envía este día aquí o usa «Guardar y enviar» en el modal para varios días.",
  listaAyuda: "Clic en la fecha → ver detalle del día · Clic en fila → editar",
  verDia: "Ver día",
  verDetalleDia: "Ver detalle del día",
  filaEditableHint: "Clic en fila para editar",
  diaBorradoresPendientes:
    "Cuando termines de registrar, envía a Aprobación.",
  toastRegistroGuardado: "Registro guardado",
  toastRegistroNuevo:
    "Registro guardado como borrador. Usa Guardar y enviar si quieres mandarlo ya a aprobación.",
  toastRegistrosRango: (count: number) =>
    `${count} borradores guardados. Usa «Guardar y enviar» la próxima vez para mandarlos todos a aprobación de una vez.`,
  toastRegistrosEnviados: (count: number) =>
    count <= 1
      ? "Registro enviado a aprobación"
      : `${count} días enviados a aprobación`,
  guardarRango: (count: number) =>
    count <= 1 ? "Guardar" : `Guardar ${count} días`,
  guardarYEnviar: (count: number) =>
    count <= 1 ? "Guardar y enviar" : `Guardar y enviar ${count} días`,
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
  ifsTimesheetWarning: {
    sessionExpired:
      "Tu sesión con IFS expiró. Mostrando registros locales. Vuelve a iniciar sesión para ver tu hoja IFS.",
    fetchFailed:
      "No se pudo leer la hoja de IFS. Mostrando registros locales.",
  },
} as const;
