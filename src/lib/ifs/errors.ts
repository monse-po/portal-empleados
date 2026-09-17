export class IfsApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "IfsApiError";
    this.status = status;
    this.body = body;
  }
}

export function assertIfsOk(res: Response, body: string): void {
  if (res.ok) return;
  throw new IfsApiError(
    `IFS API ${res.status} ${res.statusText}`,
    res.status,
    body,
  );
}

type IfsErrorBody = {
  error?: {
    message?: string;
    code?: string;
    details?: Array<{ message?: string }>;
  };
  Message?: string;
  message?: string;
  EmpTimeRegResp?: Array<{ ErrorMsg?: string }>;
  EmpTimeUpdateResp?: Array<{ ErrorMsg?: string }>;
  EmpTimeDeleteResp?: Array<{ ErrorMsg?: string }>;
  value?: {
    EmpTimeRegResp?: Array<{ ErrorMsg?: string }>;
    EmpTimeUpdateResp?: Array<{ ErrorMsg?: string }>;
    EmpTimeDeleteResp?: Array<{ ErrorMsg?: string }>;
  };
};

function rowErrorMsgs(
  rows: Array<{ ErrorMsg?: string }> | undefined,
): string[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => row.ErrorMsg?.trim())
    .filter((msg): msg is string => Boolean(msg));
}

/** Extrae el texto útil del body OData/JSON de IFS. */
function extractIfsDetail(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";

  try {
    const json = JSON.parse(trimmed) as IfsErrorBody;
    const respMsgs = [
      ...rowErrorMsgs(json.EmpTimeRegResp),
      ...rowErrorMsgs(json.EmpTimeUpdateResp),
      ...rowErrorMsgs(json.EmpTimeDeleteResp),
      ...rowErrorMsgs(json.value?.EmpTimeRegResp),
      ...rowErrorMsgs(json.value?.EmpTimeUpdateResp),
      ...rowErrorMsgs(json.value?.EmpTimeDeleteResp),
    ];
    const uniqueResp = [...new Set(respMsgs)];
    if (uniqueResp.length) return uniqueResp.join(" ");

    const detailMsgs = (json.error?.details ?? [])
      .map((d) => d.message?.trim())
      .filter((m): m is string => Boolean(m));
    // IFS a veces repite el mismo detalle dos veces
    const uniqueDetails = [...new Set(detailMsgs)];
    const nested = uniqueDetails.join(" ");
    const msg =
      nested ||
      json.error?.message ||
      json.Message ||
      json.message ||
      "";
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  } catch {
    /* cuerpo no JSON */
  }

  return trimmed.replace(/\s+/g, " ").trim();
}

/**
 * Traduce errores IFS a lenguaje simple para ~2k empleados de planta.
 * Reglas de negocio (corte, tope, LOV) → qué hacer, sin mandar a TI.
 * TI solo cuando es sesión/técnico real.
 */
export function humanizeIfsDetail(detail: string): string | null {
  const text = detail.replace(/\s+/g, " ").trim();
  if (!text) return null;

  // El digest de Next no es un error de negocio: lo resuelve portalActionError
  // con el fallback del flujo (guardar horas, anticipo, DSE…).
  if (isOpaqueServerActionError(text)) return null;

  // Periodo IFS cerrado (HRNOR) — más específico que el cutoff de extras
  if (/COTCANREP005|periodo no esta activo/i.test(text)) {
    const periodo = text.match(/\b20\d{4}\b/)?.[0];
    const periodoLabel = periodo
      ? `${periodo.slice(0, 4)}-${periodo.slice(4)}`
      : "ese mes";
    return `El periodo ${periodoLabel} no está abierto para registrar horas. Elige una fecha de un mes ya abierto.`;
  }

  // Corte de fechas (extras u otros grupos) — regla HQ, no ticket a TI
  if (
    /CEmpOverTimeCutOff|COTCANREP|fecha de registro ha vencido/i.test(text)
  ) {
    const esExtras = /HREXT/i.test(text);
    return esExtras
      ? "Esa fecha ya no admite horas extras. Elige una fecha más reciente."
      : "Esa fecha ya está cerrada para registro. Elige una fecha más reciente.";
  }

  const mentionsExtra =
    /hora(s)?\s*extra|overtime|HREXT|extra diurn/i.test(text);
  const mentionsJornada =
    /antes|before|hasta completar|must (be )?(report|complete)|scheduled hours|horas programadas|jornada|diurnas? normales|\bDN\b/i.test(
      text,
    );
  if (
    (mentionsExtra && mentionsJornada) ||
    /no se puede(n)? (reportar|registrar) hora(s)? extra/i.test(text) ||
    /cannot report overtime|overtime hours cannot/i.test(text)
  ) {
    return "Completa primero la jornada normal (DN). IFS no acepta extras hasta llenar las horas del día.";
  }

  if (
    (/ReportCostCode|c[oó]digo de reporte|tipo de hora|wage code|report cost/i.test(
      text,
    ) &&
      /no (es )?v[aá]lid|invalid|not valid|not a valid|no existe|no aplica|not allowed|no permit/i.test(
        text,
      )) ||
    /invalid report cost|report cost code is not valid/i.test(text)
  ) {
    return "Ese tipo de hora no es válido para esta actividad o fecha. Elige otro de la lista.";
  }

  if (
    /CNOTVALIDEVENT|no es un evento valido|not a valid event/i.test(text)
  ) {
    return "No se puede cancelar: la solicitud ya no está en Lanzado.";
  }

  if (/CINVALIDDEST|codigo de destino no es valido/i.test(text)) {
    return "Ese destino no es válido en IFS. Elige un destino de la lista.";
  }

  if (/CINVALIDSUPP|no esta configurado como proveedor/i.test(text)) {
    return "Ese empleado no está configurado como proveedor en IFS. Elige a otro o pide a Administración que lo configure.";
  }

  if (/CompanyEmp\.EMPLOYEE|Employee \S+ does not exist/i.test(text)) {
    return "Ese empleado no existe en la empresa IFS. Revisa la compañía o elige otro beneficiario.";
  }

  if (
    /CREPSCHEXT002|no se permite el registro de horas en d[ií]as no laborables/i.test(
      text,
    )
  ) {
    return "IFS rechazó el día como no laborable. Si es lun–vie, el calendario de días sí aplica; no hay que programar horas.";
  }

  if (/is not updatable/i.test(text)) {
    return "Ese campo no se puede cambiar en una solicitud ya creada. Ajusta monto, NIF o documento.";
  }

  if (/ORA-06531|uninitialized collection/i.test(text)) {
    return "No se pudo completar la aprobación en IFS. Intenta de nuevo o avisa a tu jefe.";
  }

  if (
    /401|unauthorized|sesión.*expir|session expired|token inválido/i.test(text)
  ) {
    return "Tu sesión venció. Vuelve a iniciar sesión.";
  }

  if (
    /no.*permiso|not authorized|access denied|forbidden/i.test(text) ||
    /\b403\b/.test(text)
  ) {
    return "No puedes hacer esta acción con tu usuario. Consulta a tu jefe.";
  }

  if (
    /no.*encontr|not found|does not exist|no existe/i.test(text) &&
    /registro|transaction|objid|timesheet/i.test(text)
  ) {
    return "No se encontró el registro. Recarga e intenta de nuevo.";
  }

  return null;
}

/** Une ErrorMsg de EmpTime*Resp y los traduce para planta. */
export function formatIfsBusinessErrors(errors: string[]): string {
  const unique = [...new Set(errors.map((e) => e.trim()).filter(Boolean))];
  if (!unique.length) {
    return "IFS rechazó el registro. Completa la jornada normal (DN) o elige un tipo de hora válido.";
  }
  const joined = unique.join(" · ");
  return (
    humanizeIfsDetail(joined) ??
    unique.map((msg) => humanizeIfsDetail(msg) ?? msg)[0]
  );
}

/** Fallback de todo el portal cuando Next oculta el ErrorMsg. */
export const PORTAL_IFS_ERROR_FALLBACK =
  "IFS rechazó la acción. Revisa el dato enviado (tipo de hora o jornada DN, destino, NIF, estado Lanzado) o si tu sesión venció.";

/** Next en producción borra el mensaje de la Server Action (solo deja este texto). */
export function isOpaqueServerActionError(err: unknown): boolean {
  const text =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : "";
  return /Server Components render|omitted in production builds|digest property is included/i.test(
    text,
  );
}

/** Limpia un texto ya listo para UI (toast, banner, loadError). */
export function sanitizePortalErrorMessage(
  message: string,
  fallback = PORTAL_IFS_ERROR_FALLBACK,
): string {
  const text = message.replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  if (isOpaqueServerActionError(text)) return fallback;
  return humanizeIfsDetail(text) ?? text;
}

/** Mensaje para toast/UI: IFS real si llegó; si Next lo tapó, el fallback del flujo. */
export function portalActionError(
  err: unknown,
  fallback = PORTAL_IFS_ERROR_FALLBACK,
): string {
  if (isOpaqueServerActionError(err)) return fallback;
  const formatted = formatIfsError(err).trim();
  if (!formatted || formatted === "Error IFS desconocido") return fallback;
  return sanitizePortalErrorMessage(formatted, fallback);
}

export function formatIfsError(err: unknown): string {
  if (err instanceof IfsApiError) {
    if (err.status === 401) {
      return "Tu sesión venció. Vuelve a iniciar sesión.";
    }

    const detail = extractIfsDetail(err.body);
    const friendly =
      humanizeIfsDetail(detail) ??
      humanizeIfsDetail(err.message) ??
      humanizeIfsDetail(err.body);
    if (friendly) return dedupeAdjacentRepeat(friendly);

    // Preferir mensaje limpio de IFS (español) sin el prefijo "IFS API 400 —"
    if (detail && detail.length <= 320 && !detail.startsWith("{")) {
      return dedupeAdjacentRepeat(detail);
    }

    const fallback = (detail || err.body).replace(/\s+/g, " ").trim().slice(0, 240);
    return dedupeAdjacentRepeat(
      fallback ? `${err.message} — ${fallback}` : err.message,
    );
  }

  if (err instanceof Error) {
    const msg = humanizeIfsDetail(err.message) ?? err.message;
    return dedupeAdjacentRepeat(msg);
  }

  return "Error IFS desconocido";
}

/** Evita "Mensaje.Mensaje." cuando IFS o el toast duplican el mismo texto. */
function dedupeAdjacentRepeat(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 20) return t;
  const half = Math.floor(t.length / 2);
  const a = t.slice(0, half).trim();
  const b = t.slice(half).trim();
  if (a && a === b) return a;
  // Mismo mensaje pegado sin espacio: "Hola.Hola."
  const m = t.match(/^(.+?[.!?])\1$/);
  if (m) return m[1];
  return t;
}
