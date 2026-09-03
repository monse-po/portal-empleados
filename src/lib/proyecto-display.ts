/** Código base IFS (ProjectId). Quita « · nombre» y el ShortName proyecto.sub.act. */
export function baseProyectoCodigo(raw?: string | null): string {
  const first = (raw ?? "").split("·")[0].trim();
  if (!first) return "";
  if (first.includes(".")) {
    const head = first.split(".")[0]?.trim();
    if (head) return head;
  }
  return first;
}

/** Descripción aparte del código. Vacío si es el mismo ProjectId. */
export function baseProyectoNombre(
  raw?: string | null,
  nombre?: string | null,
): string {
  const code = baseProyectoCodigo(raw);
  const fromCombo = (raw ?? "").split("·")[1]?.trim() ?? "";
  const n = (nombre ?? fromCombo).trim();
  if (!n || n === code || n === (raw ?? "").trim()) return "";
  return n;
}
