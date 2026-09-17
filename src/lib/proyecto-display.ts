/** Primera palabra tipo código IFS (letras + dígitos), p. ej. TIC1000. */
function codigoCabeza(raw: string): { code: string; rest: string } {
  const text = raw.trim();
  const byDot = text.split("·");
  const head = (byDot[0] || "").trim();
  const afterDot = (byDot[1] || "").trim();
  const short = head.includes(".") ? head.split(".")[0]?.trim() || head : head;
  const spaced = short.match(/^([A-Za-z]{1,12}\d[\w-]{0,20})\s+(.+)$/);
  if (spaced) {
    return { code: spaced[1], rest: afterDot || spaced[2] };
  }
  return { code: short, rest: afterDot };
}

/** Código base IFS (ProjectId). Quita « · nombre», ShortName y «CODE nombre». */
export function baseProyectoCodigo(raw?: string | null): string {
  return codigoCabeza(raw ?? "").code;
}

/** Descripción aparte del código. Vacío si es el mismo ProjectId. */
export function baseProyectoNombre(
  raw?: string | null,
  nombre?: string | null,
): string {
  const rawText = (raw ?? "").trim();
  const { code, rest } = codigoCabeza(rawText);
  const fromNombre = (nombre ?? "").trim();
  if (fromNombre && fromNombre !== code && fromNombre !== rawText) {
    return fromNombre;
  }
  if (rest && rest !== code) return rest;
  if (fromNombre && fromNombre !== code && fromNombre.startsWith(code)) {
    return fromNombre.slice(code.length).trim();
  }
  return "";
}
