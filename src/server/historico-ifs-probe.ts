"use server";

import {
  getEmpReportItemByProjectTransactionSeq,
  getEmployeeReportItemsHistorico,
  getEmployeeReportItemsHistoricoMainChannel,
  getEmployeeTimesheet,
  getHoursSummary,
  getReferenceEmpReportItemsHistorico,
  getReferenceProjectTransactionBySeq,
  getReferenceProjectTransactionsConfirmed,
  getUserInfo,
  openCempPortalSession,
} from "@/src/lib/ifs/cemp-portal";
import { cempPortalMainBaseUrl, cempPortalUserPath, ifsFetch } from "@/src/lib/ifs/client";
import { getIfsConfig } from "@/src/lib/ifs/config";
import { formatIfsError } from "@/src/lib/ifs/errors";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import {
  flattenReportItemRow,
  mapEmpReportItemToRegistro,
  mapEmployeeTimesheetToRegistros,
  mapReportItemsHistoricoToRegistros,
  parseEmpReportItems,
} from "@/src/lib/ifs/tiempo-timesheet";
import {
  getHistoricoFechaMinimaIso,
  isRegistroHistoricoConfirmado,
} from "@/src/lib/historico-tiempo";
import { getServerIfsSession } from "@/src/lib/ifs/session";

/** Secuencias Confirmado visibles en Aurena (Transacciones Proyecto) para EmpNo 1001138468. */
const SAMPLE_CONFIRMED_SEQS = [512481, 512482, 512483, 512484, 512485];

export type HistoricoIfsProbeRow = {
  fecha?: string;
  horas?: number;
  estado?: string;
  cStatus?: string;
  cStatusDb?: string;
  proy?: string;
};

export type HistoricoIfsProbeResult = {
  ok: boolean;
  email?: string;
  empNo?: string;
  companyId?: string;
  empId?: string;
  activePeriod?: string;
  desdeIso: string;
  confirmedHours?: number;
  timesheetRaw: number;
  timesheetMapped: number;
  timesheetAprobados: number;
  reportItemRaw: number;
  reportItemMapped: number;
  reportItemAprobados: number;
  referenceRaw: number;
  referenceMapped: number;
  referenceAprobados: number;
  reportItemNoExpandRaw: number;
  /** Lectura por ProjectTransactionSeq (pantalla Aurena). */
  bySeqEmpReport?: string;
  bySeqProjectTx?: string;
  confirmedProjectTxCount?: number;
  mainChannelRaw?: number;
  mainChannelDetail?: string;
  sampleTimesheet?: HistoricoIfsProbeRow;
  sampleReportItem?: HistoricoIfsProbeRow;
  sampleReference?: HistoricoIfsProbeRow;
  timesheetJsonPreview?: string;
  errors: string[];
};

function sampleRow(
  raw: unknown,
  useFlatten: boolean,
): HistoricoIfsProbeRow | undefined {
  const rows = parseEmpReportItems(raw);
  if (!rows.length) return undefined;
  const row = useFlatten
    ? flattenReportItemRow(rows[0] as Parameters<typeof flattenReportItemRow>[0])
    : rows[0];
  const mapped = mapEmpReportItemToRegistro(row, 0);
  return {
    fecha: row.AccountDate?.slice(0, 10),
    horas: mapped?.horas,
    estado: mapped?.estado,
    cStatus: String(row.CStatus ?? ""),
    cStatusDb: row.CStatusDb,
    proy: mapped?.proy ?? row.ShortName ?? row.ProjectId ?? row.Col2,
  };
}

function countAprobados(mapped: ReturnType<typeof mapEmployeeTimesheetToRegistros>) {
  return mapped.filter((r) => isRegistroHistoricoConfirmado(r.estado)).length;
}

/** Diagnóstico: qué devuelve IFS vs qué filtra Mi Histórico. */
export async function probeHistoricoIfsAction(): Promise<HistoricoIfsProbeResult> {
  const desdeIso = getHistoricoFechaMinimaIso();
  const empty: HistoricoIfsProbeResult = {
    ok: false,
    desdeIso,
    timesheetRaw: 0,
    timesheetMapped: 0,
    timesheetAprobados: 0,
    reportItemRaw: 0,
    reportItemMapped: 0,
    reportItemAprobados: 0,
    referenceRaw: 0,
    referenceMapped: 0,
    referenceAprobados: 0,
    reportItemNoExpandRaw: 0,
    errors: ["Sin sesión IFS"],
  };

  const session = await getServerIfsSession();
  if (!session) return empty;

  try {
    return await withValidIfsSession(async (liveSession) => {
      const errors: string[] = [];
      const ifs = await openCempPortalSession(
        liveSession.email,
        liveSession.accessToken,
      );
      const info = await getUserInfo(ifs).catch((e) => {
        errors.push(`GetUserInfo: ${formatIfsError(e)}`);
        return {
          CompanyId: undefined,
          EmpNo: undefined,
          ActivePeriod: undefined,
        };
      });

      let confirmedHours: number | undefined;
      try {
        const summary = await getHoursSummary(ifs);
        confirmedHours = summary.ConfirmedHours;
      } catch (e) {
        errors.push(`GetHoursSummary: ${formatIfsError(e)}`);
      }

      let timesheetRaw = 0;
      let timesheetMapped: ReturnType<typeof mapEmployeeTimesheetToRegistros> = [];
      let timesheetJsonPreview: string | undefined;
      let sheetBody: unknown;
      try {
        sheetBody = await getEmployeeTimesheet(ifs);
        timesheetJsonPreview = JSON.stringify(sheetBody).slice(0, 1200);
        timesheetRaw = parseEmpReportItems(sheetBody).length;
        timesheetMapped = mapEmployeeTimesheetToRegistros(sheetBody);
      } catch (e) {
        errors.push(`GetEmployeeTimesheet: ${formatIfsError(e)}`);
      }

      let reportItemRaw = 0;
      let reportItemMapped: ReturnType<typeof mapReportItemsHistoricoToRegistros> = [];
      let reportItemRawBody: unknown;
      try {
        reportItemRawBody = await getEmployeeReportItemsHistorico(ifs, desdeIso);
        reportItemRaw = parseEmpReportItems(reportItemRawBody).length;
        reportItemMapped = mapReportItemsHistoricoToRegistros(reportItemRawBody);
      } catch (e) {
        errors.push(`ReportItemSet: ${formatIfsError(e)}`);
      }

      let reportItemNoExpandRaw = 0;
      try {
        const base = `${cempPortalUserPath(ifs.emailId)}/ReportItemSet?$top=50`;
        const noExpand = await ifsFetch<unknown>(base, {
          accessToken: ifs.accessToken,
        });
        reportItemNoExpandRaw = parseEmpReportItems(noExpand).length;
      } catch (e) {
        errors.push(`ReportItemSet sin expand: ${formatIfsError(e)}`);
      }

      let referenceRaw = 0;
      let referenceMapped: ReturnType<typeof mapReportItemsHistoricoToRegistros> = [];
      let referenceRawBody: unknown;
      const companyId = info.CompanyId?.trim() || ifs.user.CompanyId?.trim() || "";
      const empNo = info.EmpNo?.trim() || "";
      if (empNo) {
        try {
          referenceRawBody = await getReferenceEmpReportItemsHistorico(
            ifs,
            companyId,
            empNo,
            desdeIso,
          );
          referenceRaw = parseEmpReportItems(referenceRawBody).length;
          referenceMapped = mapReportItemsHistoricoToRegistros(referenceRawBody);
        } catch (e) {
          errors.push(`Reference_EmpReportItem: ${formatIfsError(e)}`);
        }
      }

      // Prueba con secuencias Confirmado de la captura Aurena
      let bySeqEmpReport: string | undefined;
      let bySeqProjectTx: string | undefined;
      const sampleSeq = SAMPLE_CONFIRMED_SEQS[0];
      try {
        const bySeq = await getEmpReportItemByProjectTransactionSeq(ifs, sampleSeq);
        const n = parseEmpReportItems(bySeq).length;
        bySeqEmpReport = `seq ${sampleSeq}: ${n} fila(s) EmpReportItem · ${JSON.stringify(bySeq).slice(0, 400)}`;
      } catch (e) {
        bySeqEmpReport = `seq ${sampleSeq} EmpReportItem: ${formatIfsError(e)}`;
      }
      try {
        const pt = await getReferenceProjectTransactionBySeq(ifs, sampleSeq);
        bySeqProjectTx = `seq ${sampleSeq}: ${JSON.stringify(pt).slice(0, 500)}`;
      } catch (e) {
        bySeqProjectTx = `seq ${sampleSeq} ProjectTransaction: ${formatIfsError(e)}`;
      }

      let confirmedProjectTxCount: number | undefined;
      try {
        const confirmed = await getReferenceProjectTransactionsConfirmed(ifs, 50);
        const value = (confirmed as { value?: unknown[] })?.value;
        confirmedProjectTxCount = Array.isArray(value) ? value.length : 0;
      } catch (e) {
        errors.push(`Reference_ProjectTransaction Confirmado: ${formatIfsError(e)}`);
      }

      let mainChannelRaw: number | undefined;
      let mainChannelDetail: string | undefined;
      try {
        const mainBase = cempPortalMainBaseUrl();
        const intBase = getIfsConfig().cempPortalBaseUrl;
        if (mainBase.replace(/\/$/, "") === intBase.replace(/\/$/, "")) {
          mainChannelDetail = "Canal main = int (no hay alternativa)";
        } else if (empNo) {
          const raw = await getEmployeeReportItemsHistoricoMainChannel(
            ifs,
            companyId,
            empNo,
            desdeIso,
          );
          mainChannelRaw = parseEmpReportItems(raw).length;
          mainChannelDetail = `OK via ${mainBase} · raw=${mainChannelRaw}`;
        }
      } catch (e) {
        mainChannelDetail = formatIfsError(e);
      }

      const result: HistoricoIfsProbeResult = {
        ok: errors.length === 0,
        email: liveSession.email,
        empNo: empNo || undefined,
        companyId: companyId || undefined,
        empId: ifs.user.EmpId,
        activePeriod: info.ActivePeriod,
        desdeIso,
        confirmedHours,
        timesheetRaw,
        timesheetMapped: timesheetMapped.length,
        timesheetAprobados: countAprobados(timesheetMapped),
        reportItemRaw,
        reportItemMapped: reportItemMapped.length,
        reportItemAprobados: countAprobados(reportItemMapped),
        referenceRaw,
        referenceMapped: referenceMapped.length,
        referenceAprobados: countAprobados(referenceMapped),
        reportItemNoExpandRaw,
        bySeqEmpReport,
        bySeqProjectTx,
        confirmedProjectTxCount,
        mainChannelRaw,
        mainChannelDetail,
        sampleTimesheet: sheetBody ? sampleRow(sheetBody, false) : undefined,
        sampleReportItem: reportItemRawBody
          ? sampleRow(reportItemRawBody, true)
          : undefined,
        sampleReference: referenceRawBody
          ? sampleRow(referenceRawBody, true)
          : undefined,
        timesheetJsonPreview,
        errors,
      };

      console.info("[historico-probe]", JSON.stringify(result, null, 2));
      return result;
    });
  } catch (e) {
    if (e instanceof IfsSessionExpiredError) {
      return { ...empty, errors: [e.message] };
    }
    return { ...empty, errors: [formatIfsError(e)] };
  }
}
