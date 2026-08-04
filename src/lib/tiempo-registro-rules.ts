import type { RegistroEstado, RegistroMock } from "@/src/lib/tiempo-registro";

/** Borrador: guardado en el día, aún no enviado a aprobación. */
export function isRegistroBorrador(estado: RegistroEstado): boolean {
  return estado === "Borrador";
}

/** Registrado: enviado a aprobación; el aprobador aún no confirma. */
export function isRegistroEnviado(estado: RegistroEstado): boolean {
  return estado === "Registrado";
}

/** Editable mientras el aprobador no haya aprobado. */
export function isRegistroEditable(estado: RegistroEstado): boolean {
  return estado !== "Aprobado";
}

/** Eliminable bajo las mismas reglas que edición. */
export function isRegistroEliminable(estado: RegistroEstado): boolean {
  return isRegistroEditable(estado);
}

export function hayRegistrosBorrador(registros: RegistroMock[]): boolean {
  return registros.some((r) => isRegistroBorrador(r.estado));
}

export function labelEstadoRegistro(estado: RegistroEstado): string {
  return estado;
}

/** Normaliza etiquetas legacy antes del rename de estados. */
export function normalizeRegistroEstado(estado: string): RegistroEstado {
  if (estado === "En revisión") return "Registrado";
  if (estado === "Nuevo") return "Borrador";
  if (
    estado === "Borrador" ||
    estado === "Registrado" ||
    estado === "Aprobado" ||
    estado === "Rechazado"
  ) {
    return estado;
  }
  return "Borrador";
}

const ORDEN_ESTADO_LISTA: Record<RegistroEstado, number> = {
  Borrador: 0,
  Registrado: 1,
  Rechazado: 2,
  Aprobado: 3,
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
