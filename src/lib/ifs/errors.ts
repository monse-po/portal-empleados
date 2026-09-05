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

/** Extrae el texto útil del body OData/JSON de IFS. */
function extractIfsDetail(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";

  try {
    const json = JSON.parse(trimmed) as {
      error?: {
        message?: string;
        code?: string;
        details?: Array<{ message?: string }>;
      };
      Message?: string;
      message?: string;
    };
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

  // Corte de fechas (extras u otros grupos) — regla HQ, no ticket a TI
  if (
    /CEmpOverTimeCutOff|COTCANREP|fecha de registro ha vencido/i.test(text)
  ) {
    const esExtras = /HREXT/i.test(text);
    return esExtras
      ? "Esa fecha ya no admite horas extras. Elige una fecha más reciente."
      : "Esa fecha ya está cerrada para registro. Elige una fecha más reciente.";
  }

  if (/CINVALIDDEST|codigo de destino no es valido/i.test(text)) {
    return "Ese destino no es válido en IFS. Elige un destino de la lista.";
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
