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
  /** Banner corto cuando las diurnas normales del día ya están en el tope. */
  jornadaCompletaSoloExtras: "Jornada completa · solo extras",
  horasPlaceholderSinTope: "Ej. 0.5",
  /** Ayuda fija: IFS usa DayHours decimal. */
  horasAyudaDecimales: "0.25 = 15 min · 0.5 = 30 min · 1 = 1 h",
  /** Sin sesión IFS y el día ya no admite diurnas normales. */
  selectHourTypeNeedsIfs: "Entra con IFS para ver extras",
  /** LOV IFS vacío (error o actividad sin códigos). */
  selectHourTypeVacioIfs: "IFS no devolvió tipos para esta actividad",
  /**
   * El LOV IFS de la actividad solo trae diurnas normales (DN).
   * Con jornada completa no hay extras que ofrecer.
   */
  selectHourTypeSoloDnIfs:
    "Esta actividad solo tiene DN en IFS · no hay extras",
  searchProject: "Buscar proyecto...",
  searchSubproject: "Buscar subproyecto...",
  searchActivity: "Buscar actividad...",
  estadoRegistrado: "Registrado",
  estadoLanzado: "Registrado",
  guardar: "Guardar",
  guardarCambios: "Guardar cambios",
  hintEnviarDesdeLista:
    "Al guardar, el registro se envía a IFS y queda en estado Registrado. Puedes editarlo mientras no esté aprobado.",
  hintEnviarEnVistaDia:
    "Al guardar, el registro se envía a IFS (Registrado). Puedes modificarlo hasta que el aprobador lo confirme.",
  listaAyuda: "Clic en la fecha → ver detalle del día · Clic en fila → editar",
  verDia: "Ver día",
  verDetalleDia: "Ver detalle del día",
  filaEditableHint: "Clic en fila para editar",
  toastRegistroGuardado: "Cambios enviados a IFS",
  toastRegistroNuevo:
    "Registro enviado a IFS · Registrado. Puedes modificarlo mientras no esté aprobado.",
  toastRegistrosRango: (count: number) =>
    `${count} registros enviados a IFS · Registrado. Puedes modificarlos mientras no estén aprobados.`,
  toastRegistrosEnviados: (count: number) =>
    count <= 1
      ? "Registro enviado a IFS · Registrado"
      : `${count} días enviados a IFS · Registrado`,
  guardarRango: (count: number) =>
    count <= 1
      ? "Enviar a aprobación"
      : `Enviar ${count} días a aprobación`,
  guardarYEnviar: (count: number) =>
    count <= 1
      ? "Enviar a aprobación"
      : `Enviar ${count} días a aprobación`,
  ifsCatalogError: {
    sessionExpired: (detail: string) =>
      `Tu sesión con IFS expiró (${detail}).`,
    sessionExpiredAction: "Vuelve a iniciar sesión",
    sessionExpiredSuffix:
      "con el correo asociado al empleado en DEV (EmailId de CEmpPortalUserSet) para cargar proyectos reales.",
    fetchFailed: (detail: string) =>
      `No se pudo leer proyectos de IFS (${detail}). No se usa catálogo de ejemplo.`,
    fetchFailedAction: "Revisa /dev/ifs",
    fetchFailedSuffix:
      "— si CEmpPortalUserSet y GetUserInfo están verdes, pide a TI proyectos asignados a tu empleado para esa fecha.",
    noSession:
      "Sin sesión IFS. El formulario no carga proyectos de ejemplo: entra con IFS para ver el catálogo real.",
  },
  ifsTimesheetWarning: {
    sessionExpired:
      "Tu sesión con IFS expiró. No se muestran datos de ejemplo. Vuelve a iniciar sesión para ver tu hoja IFS.",
    fetchFailed:
      "No se pudo leer la hoja de IFS. No se muestran datos de ejemplo.",
  },
} as const;
