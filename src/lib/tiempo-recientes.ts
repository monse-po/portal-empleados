import {
  findActividadMeta,
  formatLovCodeName,
  resolveActividadId,
  resolveProyectoId,
  resolveSubproyectoId,
  type TiempoCatalog,
} from "@/src/lib/ifs/tiempo-catalog";
import type { RegistroMock } from "@/src/lib/mi-tiempo-mock";

export const RECIENTES_LIMIT = 5;

export type TiempoComboReciente = {
  key: string;
  proy: string;
  sub: string;
  act: string;
  /** Código IFS (`activityNo`) — lo que se muestra en el atajo. */
  actCode: string;
  actShort: string;
  actLabel: string;
  proyLabel: string;
  subLabel: string;
  lastTipo: string;
  lastHoras: number;
};

function comboKey(proy: string, sub: string, act: string): string {
  return `${proy}::${sub}::${act}`;
}

/** Resuelve contra el LOV vigente. `null` = ya no está en el catálogo de esa fecha. */
export function resolveRegistroCombo(
  registro: RegistroMock,
  catalog: TiempoCatalog | null,
): { proy: string; sub: string; act: string } | null {
  const storedSub = registro.subproyId || registro.subproy || "";
  if (!catalog) {
    if (!registro.proy || !storedSub || !registro.act) return null;
    return { proy: registro.proy, sub: storedSub, act: registro.act };
  }

  const proy = resolveProyectoId(catalog, registro.proy);
  if (!catalog.porProyecto[proy]) return null;
  const sub = resolveSubproyectoId(catalog, proy, storedSub, registro.act);
  const act = resolveActividadId(catalog, proy, sub, registro.act);
  if (!findActividadMeta(catalog, proy, sub, act)) return null;
  return { proy, sub, act };
}

/** Últimas combinaciones distintas, más recientes primero. */
export function combosRecientesDistintos(
  registros: Record<string, RegistroMock[]>,
  catalog: TiempoCatalog | null,
  limit = RECIENTES_LIMIT,
): TiempoComboReciente[] {
  const rows = Object.values(registros)
    .flat()
    .sort((a, b) => {
      const byFecha = b.fecha.localeCompare(a.fecha);
      if (byFecha !== 0) return byFecha;
      return b.id.localeCompare(a.id);
    });

  const seen = new Set<string>();
  const out: TiempoComboReciente[] = [];

  for (const registro of rows) {
    const resolved = resolveRegistroCombo(registro, catalog);
    if (!resolved) continue;
    const key = comboKey(resolved.proy, resolved.sub, resolved.act);
    if (seen.has(key)) continue;
    seen.add(key);

    const subMeta = catalog?.porProyecto[resolved.proy]?.subs.find(
      (s) => s.id === resolved.sub,
    );
    const actMeta = findActividadMeta(
      catalog,
      resolved.proy,
      resolved.sub,
      resolved.act,
    );

    out.push({
      key,
      proy: resolved.proy,
      sub: resolved.sub,
      act: resolved.act,
      actCode: actMeta?.activityNo || resolved.act,
      actShort: actMeta?.label || registro.act,
      actLabel: actMeta
        ? formatLovCodeName(actMeta.activityNo, actMeta.label)
        : registro.act,
      proyLabel: resolved.proy,
      subLabel: subMeta
        ? formatLovCodeName(subMeta.id, subMeta.label)
        : resolved.sub,
      lastTipo: registro.tipo,
      lastHoras: registro.horas,
    });

    if (out.length >= limit) break;
  }

  return out;
}

export function matchComboReciente(
  combos: TiempoComboReciente[],
  form: { proy: string; sub: string; act: string },
): TiempoComboReciente | null {
  if (!form.proy || !form.sub || !form.act) return null;
  return (
    combos.find(
      (combo) =>
        combo.proy === form.proy &&
        combo.sub === form.sub &&
        combo.act === form.act,
    ) ?? null
  );
}
