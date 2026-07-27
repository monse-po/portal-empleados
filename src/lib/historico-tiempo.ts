import type { RegistroMock } from "@/src/lib/mi-tiempo-mock";
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

/** Solo registros aprobados, más recientes primero. */
export function getRegistrosHistoricoAprobados(
  registros: Record<string, RegistroMock[]>,
): RegistroMock[] {
  return Object.values(registros)
    .flat()
    .filter((r) => normalizeRegistroEstado(r.estado) === "Aprobado")
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

export function getHistoricoMesKey(fecha: string): string {
  return fecha.slice(0, 7);
}

export function formatHistoricoMesLabel(mesKey: string): string {
  const [y, m] = mesKey.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatHistoricoFechaCorta(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatHistoricoRango(desde: string, hasta: string): string {
  if (desde === hasta) return formatHistoricoFechaCorta(desde);
  return `${formatHistoricoFechaCorta(desde)} – ${formatHistoricoFechaCorta(hasta)}`;
}
