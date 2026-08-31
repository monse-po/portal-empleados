import type { RegistroEstado, RegistroMock } from "@/src/lib/tiempo-registro";

/** Registrado: ya está en IFS; el aprobador aún no confirma. */
export function isRegistroEnviado(estado: RegistroEstado): boolean {
  return estado === "Registrado" || estado === "Lanzado";
}

/** Editable mientras el aprobador no haya aprobado. */
export function isRegistroEditable(estado: RegistroEstado): boolean {
  return estado !== "Aprobado";
}

/** Eliminable bajo las mismas reglas que edición. */
export function isRegistroEliminable(estado: RegistroEstado): boolean {
  return isRegistroEditable(estado);
}

export function labelEstadoRegistro(estado: RegistroEstado): string {
  if (estado === "Lanzado") return "Registrado";
  return estado;
}

/** Normaliza etiquetas legacy (Borrador / Lanzado / En revisión → Registrado). */
export function normalizeRegistroEstado(estado: string): RegistroEstado {
  if (
    estado === "En revisión" ||
    estado === "Lanzado" ||
    estado === "Nuevo" ||
    estado === "Borrador"
  ) {
    return "Registrado";
  }
  if (
    estado === "Registrado" ||
    estado === "Aprobado" ||
    estado === "Rechazado"
  ) {
    return estado;
  }
  return "Registrado";
}

const ORDEN_ESTADO_LISTA: Record<RegistroEstado, number> = {
  Registrado: 0,
  Lanzado: 0,
  Rechazado: 1,
  Aprobado: 2,
};

export function compareRegistrosLista(a: RegistroMock, b: RegistroMock): number {
  const ea = normalizeRegistroEstado(a.estado);
  const eb = normalizeRegistroEstado(b.estado);
  const byEstado = ORDEN_ESTADO_LISTA[ea] - ORDEN_ESTADO_LISTA[eb];
  if (byEstado !== 0) return byEstado;
  return a.id.localeCompare(b.id);
}

export type ListaRegistroDia = {
  fecha: string;
  registros: RegistroMock[];
  totalHoras: number;
};

/** Vista Lista: todos los registros agrupados por día. */
export function getListaRegistrosPorDia(
  registros: Record<string, RegistroMock[]>,
): ListaRegistroDia[] {
  const porDia: Record<string, RegistroMock[]> = {};

  for (const rows of Object.values(registros)) {
    for (const row of rows) {
      const normalized: RegistroMock = {
        ...row,
        estado: normalizeRegistroEstado(row.estado),
      };
      if (!porDia[normalized.fecha]) porDia[normalized.fecha] = [];
      porDia[normalized.fecha].push(normalized);
    }
  }

  return Object.keys(porDia)
    .sort((a, b) => b.localeCompare(a))
    .map((fecha) => {
      const dayRows = [...porDia[fecha]].sort(compareRegistrosLista);
      return {
        fecha,
        registros: dayRows,
        totalHoras: dayRows.reduce((s, r) => s + r.horas, 0),
      };
    });
}
