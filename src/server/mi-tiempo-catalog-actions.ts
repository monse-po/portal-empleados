"use server";

import {
  getValidActReportCode,
  getValidEmpPrjAct,
  openCempPortalSession,
} from "@/src/lib/ifs/cemp-portal";
import {
  buildTiempoCatalogFromIfs,
  mapReportCodesToTipos,
  type TiempoCatalog,
  type TiempoTipoHoraOption,
} from "@/src/lib/ifs/tiempo-catalog";
import type {
  LovReportCostCodeRow,
  ValidEmpPrjActRow,
} from "@/src/lib/ifs/types";
import { getServerIfsSession } from "@/src/lib/ifs/session";

export async function getIfsSessionStatusAction(): Promise<{
  connected: boolean;
  email?: string;
}> {
  const session = await getServerIfsSession();
  if (!session) return { connected: false };
  return { connected: true, email: session.email };
}

export async function fetchTiempoCatalogAction(accountDate: string): Promise<{
  catalog: TiempoCatalog | null;
  error?: string;
}> {
  const session = await getServerIfsSession();
  if (!session) {
    return { catalog: null, error: "Sin sesión IFS. Conecta en /dev/ifs" };
  }

  try {
    const ifs = await openCempPortalSession(session.email, session.accessToken);
    const raw = await getValidEmpPrjAct(ifs, accountDate);
    const rows =
      (raw as { value?: ValidEmpPrjActRow[] }).value ??
      (Array.isArray(raw) ? (raw as ValidEmpPrjActRow[]) : []);
    return { catalog: buildTiempoCatalogFromIfs(rows) };
  } catch (err) {
    return {
      catalog: null,
      error: err instanceof Error ? err.message : "Error al leer catálogo IFS",
    };
  }
}

export async function fetchTiposHoraAction(input: {
  companyId: string;
  projectId: string;
  subProjectId: string;
  accountDate: string;
  activitySeq: number;
}): Promise<{ tipos: TiempoTipoHoraOption[]; error?: string }> {
  const session = await getServerIfsSession();
  if (!session) {
    return { tipos: [], error: "Sin sesión IFS" };
  }

  try {
    const ifs = await openCempPortalSession(session.email, session.accessToken);
    const raw = await getValidActReportCode(ifs, {
      CompanyId: input.companyId,
      ProjectId: input.projectId,
      SubProjectId: input.subProjectId,
      AccountDate: input.accountDate,
      ActivitySeq: input.activitySeq,
    });
    const rows =
      (raw as { value?: LovReportCostCodeRow[] }).value ??
      (Array.isArray(raw) ? (raw as LovReportCostCodeRow[]) : []);
    return { tipos: mapReportCodesToTipos(rows) };
  } catch (err) {
    return {
      tipos: [],
      error: err instanceof Error ? err.message : "Error al leer tipos de hora",
    };
  }
}
