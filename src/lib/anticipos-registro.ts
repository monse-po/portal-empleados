import type { IconName } from "@/src/components/ui/Icon";

export type AnticipoEstado =
  | "Lanzado"
  | "Aprobado"
  | "Pagado"
  | "Rechazado"
  | "Cancelado";

export type AnticipoTipo = "Gasto" | "Viaje";

export type AnticipoTab = "pendientes" | "disponibles";

export type Anticipo = {
  no: string;
  fecha: string;
  proy: string;
  proyN: string;
  tipo: AnticipoTipo;
  monto: number;
  div: string;
  estado: AnticipoEstado;
  /** true = Historial · false = En proceso */
  disponible: boolean;
  motivo: string;
  fechaAprob: string | null;
  aprobador: string | null;
  pago: string;
  solicitante?: string;
  solicitanteId?: string;
  beneficiarioId?: string;
  beneficiarioNombre?: string;
  paraOtro?: boolean;
  cedula?: string;
};

export type TimelineItem = {
  accion: string;
  usuario: string;
  fecha: string;
  icon: "send" | "clock" | "check" | "x" | "ban" | "info";
  color: string;
};

export type AnticipoExtra = {
  compania: string;
  empCompania: string;
  empId: string;
  ifsRef?: string;
  aprobadoPor?: string;
  fechaIda?: string;
  fechaRegreso?: string;
  destino?: string;
  tipoViaje?: "nacional" | "internacional";
  cuenta?: string;
  banco?: string;
  tipoCuenta?: string;
  tl: TimelineItem[];
};

export type LovItem = {
  id: string;
  nombre: string;
  sub: string;
};

export const ESTADOS_POR_TAB: Record<AnticipoTab, AnticipoEstado[]> = {
  pendientes: ["Lanzado", "Aprobado"],
  disponibles: ["Pagado", "Rechazado", "Cancelado"],
};

export function normalizeAnticipoId(id: string): string {
  return id.replace(/\./g, "");
}

export function getAnticipoBeneficiarioId(a: Anticipo): string {
  return (
    a.beneficiarioId ??
    normalizeAnticipoId(a.cedula ?? "")
  );
}

export function getAnticipoSolicitanteId(a: Anticipo): string {
  return a.solicitanteId ?? getAnticipoBeneficiarioId(a);
}

export function anticipoVisibleParaEmpleado(
  a: Anticipo,
  sessionEmpleadoId: string,
): boolean {
  const sessionId = normalizeAnticipoId(sessionEmpleadoId);
  return (
    getAnticipoBeneficiarioId(a) === sessionId ||
    getAnticipoSolicitanteId(a) === sessionId
  );
}

export function getBeneficiarioNombre(a: Anticipo): string {
  return a.beneficiarioNombre ?? "—";
}

export function getBeneficiarioSolicitante(
  a: Anticipo,
  sessionEmpleadoId: string,
): string | null {
  const sessionId = normalizeAnticipoId(sessionEmpleadoId);
  const solId = getAnticipoSolicitanteId(a);
  if (solId !== sessionId && a.solicitante) {
    return a.solicitante;
  }
  return null;
}

export function isAnticipoDisponible(estado: AnticipoEstado): boolean {
  return estado === "Pagado" || estado === "Rechazado" || estado === "Cancelado";
}

export function hoyDMY(fecha = new Date()): string {
  const d = String(fecha.getDate()).padStart(2, "0");
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const y = fecha.getFullYear();
  return `${d}/${m}/${y}`;
}

export function hoyIso(base: Date = new Date()): string {
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const d = String(base.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isoToDmy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function filterAnticiposByTab(
  anticipos: Record<string, Anticipo>,
  tab: AnticipoTab,
  sessionEmpleadoId: string,
): Anticipo[] {
  return Object.values(anticipos)
    .filter((a) => anticipoVisibleParaEmpleado(a, sessionEmpleadoId))
    .filter((a) => (tab === "disponibles" ? a.disponible : !a.disponible))
    .sort((a, b) => dmyToSortKey(b.fecha) - dmyToSortKey(a.fecha));
}

export function countAnticiposTab(
  anticipos: Record<string, Anticipo>,
  sessionEmpleadoId: string,
): { pendientes: number; disponibles: number } {
  const all = Object.values(anticipos).filter((a) =>
    anticipoVisibleParaEmpleado(a, sessionEmpleadoId),
  );
  return {
    pendientes: all.filter((a) => !a.disponible).length,
    disponibles: all.filter((a) => a.disponible).length,
  };
}

export function puedeCancelarEmpleado(
  anticipo: Anticipo,
  sessionEmpleadoId: string,
): boolean {
  if (anticipo.estado !== "Lanzado") return false;
  const sessionId = normalizeAnticipoId(sessionEmpleadoId);
  return getAnticipoSolicitanteId(anticipo) === sessionId;
}

export function dmyToSortKey(dmy: string): number {
  const [d, m, y] = dmy.split("/").map(Number);
  return y * 10000 + m * 100 + d;
}

export function agregarDiasHabiles(fecha: Date, dias: number): Date {
  const d = new Date(fecha);
  let agregados = 0;
  while (agregados < dias) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) agregados++;
  }
  return d;
}

export function fechaMinSalida(base: Date = new Date()): string {
  return hoyIso(agregarDiasHabiles(base, 2));
}

export function validarFechaIdaViaje(fechaIdaIso: string): boolean {
  if (!fechaIdaIso) return false;
  return fechaIdaIso >= fechaMinSalida();
}

export function pagoCeldaEnProceso(a: Anticipo): string | null {
  if (a.estado === "Aprobado") return a.pago || "Pendiente";
  return null;
}

export function getBeneficiarioDetalle(a: Anticipo, extra?: AnticipoExtra) {
  return {
    cedula: a.cedula ?? a.beneficiarioId ?? "—",
    nombre: a.beneficiarioNombre ?? "—",
    cuenta: extra?.cuenta ?? "—",
    banco: extra?.banco ?? "—",
    tipoCuenta: extra?.tipoCuenta ?? "—",
  };
}

export function formatMonto(monto: number, div = "COP"): string {
  const PRE_MAP: Record<string, string> = {
    COP: "$",
    USD: "US$",
    MXN: "$",
    PEN: "S/",
  };
  const pre = PRE_MAP[div] || "$";
  return `${pre} ${monto.toLocaleString("es-CO")}`;
}

export function nombreAprobador(codigo: string | null): string | null {
  if (!codigo || codigo === "—") return null;
  return codigo;
}

export const ANTICIPOS_TABLE_MIN_W_PEND = "1280px" as const;
export const ANTICIPOS_COLS_PEND = [
  "72px", "88px", "200px", "80px", "280px", "108px", "240px", "92px", "180px",
] as const;
export const ANTICIPOS_TABLE_MIN_W_HIST = "1380px" as const;
export const ANTICIPOS_COLS_HIST = [
  "72px", "88px", "190px", "80px", "260px", "108px", "220px", "92px", "88px", "172px",
] as const;
