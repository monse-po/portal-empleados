/** EmpNo / cédula sin separadores: `52.012.345` → `52012345`. */
export function empleadoCodigoDisplay(codigo?: string | null): string {
  const raw = (codigo || "").trim();
  if (!raw || raw === "—") return "";
  const digits = raw.replace(/[.\s]/g, "");
  return /^\d{6,}$/.test(digits) ? digits : "";
}

function blankDisplay(value?: string | null): string {
  const v = (value || "").trim();
  return !v || v === "—" ? "" : v;
}

/** Separa nombre y EmpNo si vinieron pegados; no duplica ni uno ni otro. */
export function splitEmpleadoNombreCodigo(
  nombre?: string | null,
  codigo?: string | null,
): { nombre: string; codigo: string } {
  let name = blankDisplay(nombre);
  let code = empleadoCodigoDisplay(codigo);

  const embedded = name.match(/(?:^|[\s·\-\/,])(\d{6,})(?=$|[\s·\-\/,])/);
  if (embedded?.[1]) {
    if (!code) code = embedded[1];
    name = name
      .replace(embedded[0], " ")
      .replace(/[\s·\-\/,]+/g, " ")
      .trim();
  }

  if (code && name && name.toLowerCase() === code.toLowerCase()) {
    name = "";
  }

  if (code && name && name.toLowerCase().includes(code.toLowerCase())) {
    name = name
      .replace(code, " ")
      .replace(/[\s·\-\/,]+/g, " ")
      .trim();
  }

  return { nombre: name, codigo: code };
}

/**
 * Valor canónico del filtro Empleado: siempre el nombre.
 * El EmpNo no se usa como opción (sí como búsqueda vía `title`).
 */
export function empleadoFiltroNombre(
  nombre?: string | null,
  codigo?: string | null,
): string {
  const parts = splitEmpleadoNombreCodigo(nombre, codigo);
  return parts.nombre || "";
}

export function empleadoMatchesFiltro(
  nombre: string | null | undefined,
  codigo: string | null | undefined,
  values: string[],
): boolean {
  if (!values.length) return true;
  const label = empleadoFiltroNombre(nombre, codigo);
  return Boolean(label && values.includes(label));
}

export function distinctEmpleadoFiltroOptions(
  items: Array<{ nombre?: string | null; codigo?: string | null }>,
): { value: string; label: string; title: string }[] {
  const map = new Map<string, { value: string; label: string; title: string }>();
  for (const item of items) {
    const parts = splitEmpleadoNombreCodigo(item.nombre, item.codigo);
    const label = parts.nombre;
    if (!label) continue;
    if (!map.has(label)) {
      map.set(label, {
        value: label,
        label,
        title: parts.codigo || label,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
}

/** Misma persona en UI: ignora mayúsculas y espacios. */
export function sameDisplayName(
  a?: string | null,
  b?: string | null,
): boolean {
  const n = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const x = n(a || "");
  const y = n(b || "");
  if (!x || !y) return false;
  if (x === y) return true;
  // "Ana Martínez" vs "Ana Martínez Rueda" — mismo nombre, un apellido más.
  const [shorter, longer] = x.length <= y.length ? [x, y] : [y, x];
  if (shorter.split(" ").length < 2) return false;
  return longer.startsWith(`${shorter} `);
}
