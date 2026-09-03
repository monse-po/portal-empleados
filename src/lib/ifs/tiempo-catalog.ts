import type {
  LovReportCostCodeRow,
  ValidEmpPrjActRow,
} from "@/src/lib/ifs/types";
import { TIPO_HORA, type TipoHoraMeta } from "@/src/lib/tiempo-registro";

export type TiempoCatalogProyecto = {
  id: string;
  nombre: string;
  projectId: string;
  companyId: string;
};

export type TiempoCatalogActividad = {
  id: string;
  activitySeq: number;
  activityNo: string;
  label: string;
  /** ShortName IFS (proyecto.sub.actividad) — lo exige EmpTimeReg. */
  shortName: string;
};

export type TiempoCatalogSubproyecto = {
  id: string;
  label: string;
  actividades: TiempoCatalogActividad[];
};

export type TiempoCatalogAprobador = {
  code?: string;
  name?: string;
};

export type TiempoCatalog = {
  proyectos: TiempoCatalogProyecto[];
  porProyecto: Record<
    string,
    {
      companyId: string;
      projectId: string;
      aprobador?: TiempoCatalogAprobador;
      subs: TiempoCatalogSubproyecto[];
    }
  >;
};

export type TiempoTipoHoraOption = {
  code: string;
  /** Texto corto para UI (pill / lista). */
  label: string;
  /** Nombre completo IFS — solo tooltip. */
  fullLabel: string;
  cat: TipoHoraMeta["cat"];
};

/** Recorta ReportCostName de IFS para el modal (sin perder el code). */
export function shortenReportCostLabel(
  name: string | undefined,
  code: string,
): string {
  const raw = (name ?? "").trim();
  if (!raw) return code;

  let s = raw;
  const prefixes = [
    `${code} - `,
    `${code} – `,
    `${code}: `,
    `${code} `,
  ];
  for (const p of prefixes) {
    if (s.toLowerCase().startsWith(p.toLowerCase())) {
      s = s.slice(p.length).trim();
      break;
    }
  }

  s = s.split(/\s*[|/]\s*/)[0]?.trim() || s;
  if (s.length > 36) s = `${s.slice(0, 34).trimEnd()}…`;
  return s || code;
}

/** Etiqueta LOV: código + nombre, sin duplicar si el nombre ya trae el código. */
export function formatLovCodeName(code: string, name?: string): string {
  const c = code.trim();
  const n = (name ?? "").trim();
  if (!c) return n;
  if (!n || n === c) return c;
  if (n.toLowerCase().startsWith(c.toLowerCase())) return n;
  return `${c} – ${n}`;
}

export function buildTiempoCatalogFromIfs(
  rows: ValidEmpPrjActRow[],
): TiempoCatalog {
  const proyectosMap = new Map<string, TiempoCatalogProyecto>();
  const porProyecto: TiempoCatalog["porProyecto"] = {};

  for (const row of rows) {
    const shortName = row.ShortName?.trim() ?? "";
    const projectId = row.ProjectId?.trim() || shortName;
    if (!projectId) continue;

    const companyId = row.CompanyId?.trim() ?? "";

    if (!proyectosMap.has(projectId)) {
      proyectosMap.set(projectId, {
        id: projectId,
        nombre: row.Name?.trim() || projectId,
        projectId,
        companyId,
      });
      porProyecto[projectId] = { companyId, projectId, subs: [] };
    }

    const entry = porProyecto[projectId];
    if (!entry.aprobador) {
      const approver = readAprobadorFromRow(row);
      if (approver) entry.aprobador = approver;
    }

    const subId = row.SubProjectId?.trim() || "—";
    const subLabel = row.SubProjectDesc?.trim() || subId;
    let sub = entry.subs.find((s) => s.id === subId);
    if (!sub) {
      sub = { id: subId, label: subLabel, actividades: [] };
      entry.subs.push(sub);
    }

    const activitySeq = row.ActivitySeq ?? 0;
    const activityNo = row.ActivityNo?.trim() || String(activitySeq);
    const actLabel = row.Description?.trim() || activityNo;
    const actId = String(activitySeq || activityNo);
    const actShortName = shortName || `${projectId}.${subId}.${activityNo}`;

    if (!sub.actividades.some((a) => a.id === actId)) {
      sub.actividades.push({
        id: actId,
        activitySeq,
        activityNo,
        label: actLabel,
        shortName: actShortName,
      });
    }
  }

  const proyectos = [...proyectosMap.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  for (const key of Object.keys(porProyecto)) {
    porProyecto[key].subs.sort((a, b) => a.label.localeCompare(b.label));
    for (const sub of porProyecto[key].subs) {
      sub.actividades.sort((a, b) => a.label.localeCompare(b.label));
    }
  }

  return { proyectos, porProyecto };
}

export function mapReportCodesToTipos(
  rows: LovReportCostCodeRow[],
): TiempoTipoHoraOption[] {
  const seen = new Set<string>();
  const tipos: TiempoTipoHoraOption[] = [];

  for (const row of rows) {
    const code = row.ReportCostCode?.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);

    const known = TIPO_HORA[code];
    const fullLabel = row.ReportCostName?.trim() || known?.n || code;
    tipos.push({
      code,
      label: known?.s || shortenReportCostLabel(row.ReportCostName, code),
      fullLabel,
      cat: known?.cat ?? (code === "DN" ? "normal" : "otro"),
    });
  }

  return tipos.sort((a, b) => a.label.localeCompare(b.label));
}

function readAprobadorFromRow(
  row: ValidEmpPrjActRow,
): TiempoCatalogAprobador | undefined {
  const name = row.CApproverName?.trim();
  const code = row.CApprover?.trim();
  if (name || code) {
    return { name: name || undefined, code: code || undefined };
  }

  const autoName = row.CAutoApproverName?.trim();
  const autoCode = row.CAutoApprover?.trim();
  if (autoName || autoCode) {
    return { name: autoName || undefined, code: autoCode || undefined };
  }

  const manager = row.Manager?.trim();
  if (manager) {
    return { name: manager };
  }

  return undefined;
}

export function applyProjectManagersToCatalog(
  catalog: TiempoCatalog,
  managersByProjectId: Map<string, string>,
): void {
  for (const [projectKey, entry] of Object.entries(catalog.porProyecto)) {
    if (entry.aprobador?.name || entry.aprobador?.code) continue;

    const manager =
      managersByProjectId.get(entry.projectId) ??
      managersByProjectId.get(projectKey);
    if (manager) {
      entry.aprobador = { name: manager };
    }
  }
}

import { TIEMPO_UI_COPY } from "@/src/lib/copy/tiempo";

/** ProjectId del catálogo, o el proyecto que contiene ese ShortName legado. */
export function resolveProyectoId(
  catalog: TiempoCatalog | null,
  storedProy: string,
): string {
  if (!catalog || !storedProy) return storedProy;
  if (catalog.porProyecto[storedProy]) return storedProy;

  for (const [id, entry] of Object.entries(catalog.porProyecto)) {
    if (entry.projectId === storedProy) return id;
    for (const sub of entry.subs) {
      if (sub.actividades.some((a) => a.shortName === storedProy)) {
        return id;
      }
    }
  }

  return storedProy;
}

export function resolveAprobadorLabel(
  catalog: TiempoCatalog | null,
  proyId: string,
): string {
  const fallback = TIEMPO_UI_COPY.approverFallback;
  if (!proyId) return fallback;
  const key = resolveProyectoId(catalog, proyId);
  const aprobador = catalog?.porProyecto[key]?.aprobador;
  if (!aprobador) return fallback;
  return aprobador.name?.trim() || aprobador.code?.trim() || fallback;
}

export function resolveSubproyectoId(
  catalog: TiempoCatalog | null,
  proyId: string,
  storedSub: string | undefined,
  actLabel: string,
): string {
  if (!catalog || !storedSub) return storedSub ?? "";
  const entry = catalog.porProyecto[resolveProyectoId(catalog, proyId)];
  if (!entry) return storedSub;

  const byId = entry.subs.find((s) => s.id === storedSub);
  if (byId) return byId.id;

  const byLabel = entry.subs.find((s) => s.label === storedSub);
  if (byLabel) return byLabel.id;

  for (const sub of entry.subs) {
    if (sub.actividades.some((a) => a.label === actLabel || a.activityNo === actLabel)) {
      return sub.id;
    }
  }

  return storedSub;
}

export function resolveActividadId(
  catalog: TiempoCatalog | null,
  proyId: string,
  subId: string,
  storedAct: string,
): string {
  if (!catalog) return storedAct;
  const sub = catalog.porProyecto[resolveProyectoId(catalog, proyId)]?.subs.find(
    (s) => s.id === subId,
  );
  if (!sub) return storedAct;

  const byId = sub.actividades.find((a) => a.id === storedAct);
  if (byId) return byId.id;

  const byLabel = sub.actividades.find(
    (a) => a.label === storedAct || a.activityNo === storedAct,
  );
  return byLabel?.id ?? storedAct;
}

export function findActividadMeta(
  catalog: TiempoCatalog | null,
  proyId: string,
  subId: string,
  actId: string,
): TiempoCatalogActividad | null {
  const sub = catalog?.porProyecto[resolveProyectoId(catalog, proyId)]?.subs.find(
    (s) => s.id === subId,
  );
  return sub?.actividades.find((a) => a.id === actId) ?? null;
}

export function tipoCatFromOptions(
  code: string,
  tipos: TiempoTipoHoraOption[],
): TipoHoraMeta["cat"] {
  const fromList = tipos.find((t) => t.code === code)?.cat;
  if (fromList) return fromList;
  return TIPO_HORA[code]?.cat ?? "otro";
}
