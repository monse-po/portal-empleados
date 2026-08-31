import type { RegistroMock } from "@/src/lib/mi-tiempo-mock";
import type { TiempoCatalog } from "@/src/lib/ifs/tiempo-catalog";
import { getProyectoListaParts } from "@/src/lib/tiempo-bridge";
import { normalizeRegistroEstado } from "@/src/lib/tiempo-registro-rules";

export type HistoricoProyectoResumen = {
  proyId: string;
  codigo: string;
  nombre: string;
  totalHoras: number;
  registros: number;
  desde: string;
  hasta: string;
};

export type HistoricoProyectoSubResumen = {
  proyId: string;
  codigo: string;
  nombre: string;
  subproy: string;
  subproyId?: string;
  totalHoras: number;
  registros: number;
  desde: string;
  hasta: string;
  /** Sigue asignado hoy (GetValidEmpPrjAct) o última hora del mes actual. */
  abierto: boolean;
};

/** Horas que cuentan para hoja de vida: enviadas o ya aprobadas (no rechazo). */
export function isRegistroHistorico(estado: RegistroMock["estado"]): boolean {
  const normalized = normalizeRegistroEstado(estado);
  return normalized === "Aprobado" || normalized === "Registrado";
}

/** Registros de histórico, más recientes primero. */
export function getRegistrosHistoricoAprobados(
  registros: Record<string, RegistroMock[]>,
): RegistroMock[] {
  return Object.values(registros)
    .flat()
    .filter((r) => isRegistroHistorico(r.estado))
    .sort((a, b) => {
      const byFecha = b.fecha.localeCompare(a.fecha);
      if (byFecha !== 0) return byFecha;
      return a.id.localeCompare(b.id);
    });
}

export function getHistoricoResumenPorProyecto(
  rows: RegistroMock[],
): HistoricoProyectoResumen[] {
  const map = new Map<string, HistoricoProyectoResumen>();

  for (const r of rows) {
    const parts = getProyectoListaParts(r.proy);
    const cur = map.get(r.proy) ?? {
      proyId: r.proy,
      codigo: parts.codigo,
      nombre: parts.nombreFull,
      totalHoras: 0,
      registros: 0,
      desde: r.fecha,
      hasta: r.fecha,
    };
    cur.totalHoras += r.horas;
    cur.registros += 1;
    if (r.fecha < cur.desde) cur.desde = r.fecha;
    if (r.fecha > cur.hasta) cur.hasta = r.fecha;
    map.set(r.proy, cur);
  }

  return [...map.values()].sort((a, b) => b.totalHoras - a.totalHoras);
}

/** Claves `shortName` y `shortName::sub` vigentes hoy (GetValidEmpPrjAct). */
export function openKeysFromCatalog(catalog: TiempoCatalog | null): Set<string> {
  const keys = new Set<string>();
  if (!catalog) return keys;
  for (const p of catalog.proyectos) {
    keys.add(p.id);
    const entry = catalog.porProyecto[p.id];
    for (const sub of entry?.subs ?? []) {
      keys.add(`${p.id}::${sub.id}`);
      if (sub.label) keys.add(`${p.id}::${sub.label}`);
    }
  }
  return keys;
}

export function nombresProyectoFromCatalog(
  catalog: TiempoCatalog | null,
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!catalog) return map;
  for (const p of catalog.proyectos) {
    if (p.nombre) map[p.id] = p.nombre;
  }
  return map;
}

type HistoricoResumenOptions = {
  openKeys?: Set<string>;
  nombresPorProy?: Record<string, string>;
};

function resolveAbierto(
  proyId: string,
  subproy: string,
  subproyId: string | undefined,
  hasta: string,
  openKeys?: Set<string>,
): boolean {
  if (openKeys && openKeys.size > 0) {
    if (subproyId && openKeys.has(`${proyId}::${subproyId}`)) return true;
    if (openKeys.has(`${proyId}::${subproy}`)) return true;
    return false;
  }
  return isTrayectoriaAbierta(hasta);
}

function mesActualIsoPrefix(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

function isTrayectoriaAbierta(hasta: string): boolean {
  return hasta.startsWith(mesActualIsoPrefix());
}

export function getHistoricoResumenPorProyectoSub(
  rows: RegistroMock[],
  options: HistoricoResumenOptions = {},
): HistoricoProyectoSubResumen[] {
  const map = new Map<string, HistoricoProyectoSubResumen>();
  const { openKeys, nombresPorProy } = options;

  for (const r of rows) {
    const subproy = r.subproy?.trim() || "—";
    const subproyId = r.subproyId?.trim();
    const key = `${r.proy}::${subproyId || subproy}`;
    const parts = getProyectoListaParts(r.proy);
    const nombre =
      r.proyNombre?.trim() ||
      nombresPorProy?.[r.proy] ||
      (parts.nombreFull !== parts.codigo ? parts.nombreFull : parts.codigo);
    const cur = map.get(key) ?? {
      proyId: r.proy,
      codigo: parts.codigo,
      nombre,
      subproy,
      subproyId,
      totalHoras: 0,
      registros: 0,
      desde: r.fecha,
      hasta: r.fecha,
      abierto: false,
    };
    if (r.proyNombre?.trim() && (cur.nombre === cur.codigo || !cur.nombre)) {
      cur.nombre = r.proyNombre.trim();
    }
    cur.totalHoras += r.horas;
    cur.registros += 1;
    if (r.fecha < cur.desde) cur.desde = r.fecha;
    if (r.fecha > cur.hasta) cur.hasta = r.fecha;
    map.set(key, cur);
  }

  for (const cur of map.values()) {
    cur.abierto = resolveAbierto(
      cur.proyId,
      cur.subproy,
      cur.subproyId,
      cur.hasta,
      openKeys,
    );
  }

  return [...map.values()].sort((a, b) => {
    const byDesde = a.desde.localeCompare(b.desde);
    if (byDesde !== 0) return byDesde;
    const byHasta = a.hasta.localeCompare(b.hasta);
    if (byHasta !== 0) return byHasta;
    const byNombre = a.nombre.localeCompare(b.nombre, "es");
    if (byNombre !== 0) return byNombre;
    return a.subproy.localeCompare(b.subproy, "es");
  });
}

export function formatHistoricoFechaCorta(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatHistoricoMesCorto(fecha: string): string {
  const [y, m] = fecha.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("es-ES", {
    month: "short",
    year: "numeric",
  });
  return label.replace(/\./g, "");
}

/** Periodo de trayectoria: cerrado = mes–mes; abierto = mes – actual. */
export function formatHistoricoRango(
  desde: string,
  hasta: string,
  abierto = false,
): string {
  const inicio = formatHistoricoMesCorto(desde);
  if (abierto) return `${inicio} – actual`;
  return `${inicio} – ${formatHistoricoMesCorto(hasta)}`;
}
