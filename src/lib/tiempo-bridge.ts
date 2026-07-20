import type { HojaAprobacion } from "@/src/lib/aprobacion-tiempo-mock";
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

const PROY_MAP: Record<string, { cod: string; label: string }> = {
  "PRY-2024-001": { cod: "PRY2024003", label: "Proyecto Gamma" },
  "PRY-2024-003": { cod: "PRY2025002", label: "Proyecto Beta" },
  "PRY-2025-002": { cod: "PRY2025001", label: "Proyecto Alfa" },
};

const EMPLEADO = {
  solicitante: "Carlos Rivas",
  nombre: "Carlos Rivas Mora",
  cedula: "1.023.456.789",
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
  const mapped = PROY_MAP[reg.proy] ?? {
    cod: "PRY2025001",
    label: "Proyecto Alfa",
  };
  const proyMeta = PROYECTOS.find((p) => p.id === reg.proy);
  const proyLabel = proyMeta
    ? `${mapped.cod} · ${proyMeta.nombre}`
    : `${mapped.cod} · ${mapped.label}`;

  return {
    no: hojaNoFromRegistro(reg),
    fecha: isoToDmy(reg.fecha),
    compania: "HMVINGCO",
    proy: proyLabel,
    subproy: reg.subproy || "—",
    tipo: reg.tipo,
    solicitante: EMPLEADO.solicitante,
    cedula: EMPLEADO.cedula,
    nombre: EMPLEADO.nombre,
    actividad: reg.act,
    horas: `${reg.horas}h`,
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
  if (nos.length === 1) return "Registro anulado · regresa a Pendientes";
  return `${nos.length} registro(s) anulado(s)`;
}
