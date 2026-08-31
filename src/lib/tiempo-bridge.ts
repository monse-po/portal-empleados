import type { HojaAprobacion } from "@/src/lib/aprobacion-tiempo-mock";
import { SESSION_EMPLEADO } from "@/src/lib/mis-anticipos-mock";
import {
  PROYECTOS,
  type RegistroEstado,
  type RegistroMock,
} from "@/src/lib/mi-tiempo-mock";

export type SyncRegistroAccion = "aprobado" | "rechazado" | "anulado";

export type SyncRegistroHandler = (
  registroId: string,
  accion: SyncRegistroAccion,
  comentario?: string,
) => void;

/** Mapea decisión del gerente al estado visible en Mi Tiempo */
export function estadoDesdeAccionAprobacion(
  accion: SyncRegistroAccion,
): RegistroEstado {
  if (accion === "aprobado") return "Aprobado";
  if (accion === "rechazado") return "Rechazado";
  return "Registrado";
}

export function comentarioRechazoDesdeAccion(
  accion: SyncRegistroAccion,
  comentario?: string,
): string {
  return accion === "rechazado" ? (comentario || "") : "";
}

const PROY_MAP: Record<string, string> = {
  "PRY-2024-001": "PRY2024003",
  "PRY-2024-003": "PRY2025002",
  "PRY-2025-002": "PRY2025001",
};

export function proyCodAprobacion(proyectoId: string): string {
  return PROY_MAP[proyectoId] ?? proyectoId.replace(/-/g, "");
}

export function nombreProyectoPorCodAprobacion(cod: string): string | undefined {
  for (const [empleadoId, aprobCod] of Object.entries(PROY_MAP)) {
    if (aprobCod !== cod) continue;
    const meta = PROYECTOS.find((p) => p.id === empleadoId);
    if (meta) return meta.nombre;
  }
  return undefined;
}

/** Etiqueta en Mi Tiempo (empleado): PRY-2024-001 – Modernización PTF Cusiana… */
export function formatProyectoEmpleado(proyectoId: string): string {
  const meta = PROYECTOS.find((p) => p.id === proyectoId);
  return meta ? `${meta.id} – ${meta.nombre}` : proyectoId;
}

export const PROYECTO_NOMBRE_LISTA_MAX = 36;

/** Código + nombre truncado para la tab Lista. */
export function getProyectoListaParts(proyectoId: string) {
  const meta = PROYECTOS.find((p) => p.id === proyectoId);
  const codigo = meta?.id ?? proyectoId;
  const nombreFull = meta?.nombre ?? proyectoId;
  const nombre =
    nombreFull.length > PROYECTO_NOMBRE_LISTA_MAX
      ? `${nombreFull.slice(0, PROYECTO_NOMBRE_LISTA_MAX)}…`
      : nombreFull;
  return { codigo, nombre, nombreFull };
}

/** Etiqueta en aprobación / notificaciones: PRY2024003 · Modernización PTF Cusiana… */
export function formatProyectoAprobacion(
  proyectoIdEmpleado: string,
): string {
  const cod = proyCodAprobacion(proyectoIdEmpleado);
  const meta = PROYECTOS.find((p) => p.id === proyectoIdEmpleado);
  const nombre = meta?.nombre ?? nombreProyectoPorCodAprobacion(cod) ?? cod;
  return `${cod} · ${nombre}`;
}

export function formatProyectoAprobacionPorCod(
  cod: string,
  fallbackNombre = "",
): string {
  const nombre =
    nombreProyectoPorCodAprobacion(cod) ?? (fallbackNombre.trim() || cod);
  return `${cod} · ${nombre}`;
}

const EMPLEADO = {
  solicitante: SESSION_EMPLEADO.nombre,
  nombre: SESSION_EMPLEADO.nombre,
  cedula: SESSION_EMPLEADO.cedula,
};

export function isoToDmy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function dmyToSortKey(dmy: string): number {
  const [d, m, y] = dmy.split("/").map(Number);
  return y * 10000 + m * 100 + d;
}

export function hojaNoFromRegistro(reg: RegistroMock): string {
  if (reg.codigo) return reg.codigo;
  const suffix = reg.id.replace(/^r/i, "").padStart(6, "0");
  return `HTREG${suffix}`;
}

export function registroToHoja(reg: RegistroMock): HojaAprobacion {
  return {
    no: hojaNoFromRegistro(reg),
    fecha: isoToDmy(reg.fecha),
    compania: "HMVINGCO",
    proy: formatProyectoAprobacion(reg.proy),
    subproy: reg.subproy || "—",
    tipo: reg.tipo,
    solicitante: EMPLEADO.solicitante,
    cedula: EMPLEADO.cedula,
    nombre: EMPLEADO.nombre,
    actividad: reg.act,
    horas: String(reg.horas),
    comentarioEmpleado: reg.comentario || "",
    aprobador: reg.aprobador || "",
    registroId: reg.id,
  };
}

export function toastAprobacionLabel(nos: string[]) {
  if (nos.length === 1) return `Registro ${nos[0]}`;
  return `${nos.length} registros`;
}

export function toastAprobados(nos: string[]) {
  return `${toastAprobacionLabel(nos)} aprobado(s) · IFS`;
}

export function toastRechazados(nos: string[], notificado = true) {
  const base = `${toastAprobacionLabel(nos)} rechazado(s)`;
  return notificado ? `${base} · El empleado fue notificado` : base;
}

export function toastAnulados(nos: string[]) {
  if (nos.length === 1) {
    return "Registro anulado · vuelve a Registrado; el empleado puede editarlo";
  }
  return `${nos.length} registro(s) anulado(s) · vuelven a Registrado`;
}
