import type {
  LovReportCostCodeRow,
  ValidEmpPrjActRow,
} from "@/src/lib/ifs/types";
import { TIPO_HORA, type TipoHoraMeta } from "@/src/lib/mi-tiempo-mock";

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
};

export type TiempoCatalogSubproyecto = {
  id: string;
  label: string;
  actividades: TiempoCatalogActividad[];
};

export type TiempoCatalog = {
  proyectos: TiempoCatalogProyecto[];
  porProyecto: Record<
    string,
    {
      companyId: string;
      projectId: string;
      subs: TiempoCatalogSubproyecto[];
    }
  >;
};

export type TiempoTipoHoraOption = {
  code: string;
  label: string;
  cat: TipoHoraMeta["cat"];
};

export function buildTiempoCatalogFromIfs(
  rows: ValidEmpPrjActRow[],
): TiempoCatalog {
  const proyectosMap = new Map<string, TiempoCatalogProyecto>();
  const porProyecto: TiempoCatalog["porProyecto"] = {};

  for (const row of rows) {
    const shortName = row.ShortName?.trim();
    if (!shortName) continue;

    const companyId = row.CompanyId?.trim() ?? "";
    const projectId = row.ProjectId?.trim() || shortName;

    if (!proyectosMap.has(shortName)) {
      proyectosMap.set(shortName, {
        id: shortName,
        nombre: row.Name?.trim() || shortName,
        projectId,
        companyId,
      });
      porProyecto[shortName] = { companyId, projectId, subs: [] };
    }

    const subId = row.SubProjectId?.trim() || "—";
    const subLabel = row.SubProjectDesc?.trim() || subId;
    const entry = porProyecto[shortName];
    let sub = entry.subs.find((s) => s.id === subId);
    if (!sub) {
      sub = { id: subId, label: subLabel, actividades: [] };
      entry.subs.push(sub);
    }

    const activitySeq = row.ActivitySeq ?? 0;
    const activityNo = row.ActivityNo?.trim() || String(activitySeq);
    const actLabel = row.Description?.trim() || activityNo;
    const actId = String(activitySeq || activityNo);

    if (!sub.actividades.some((a) => a.id === actId)) {
      sub.actividades.push({
        id: actId,
        activitySeq,
        activityNo,
        label: actLabel,
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
    tipos.push({
      code,
      label: row.ReportCostName?.trim() || known?.n || code,
      cat: known?.cat ?? (code === "DN" ? "normal" : "otro"),
    });
  }

  return tipos.sort((a, b) => a.label.localeCompare(b.label));
}

export function resolveSubproyectoId(
  catalog: TiempoCatalog | null,
  proyId: string,
  storedSub: string | undefined,
  actLabel: string,
): string {
  if (!catalog || !storedSub) return storedSub ?? "";
  const entry = catalog.porProyecto[proyId];
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
  const sub = catalog.porProyecto[proyId]?.subs.find((s) => s.id === subId);
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
  const sub = catalog?.porProyecto[proyId]?.subs.find((s) => s.id === subId);
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
