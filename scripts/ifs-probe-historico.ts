/**
 * Diagnóstico: cuántas filas trae cada fuente de Mi Histórico para EmpNo target.
 * Uso: npx tsx scripts/ifs-probe-historico.ts
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env", override: true });

import {
  findPortalUserByEmpId,
  getEmployeeReportItemsHistorico,
  getEmployeeTimesheetForEmp,
  getHoursSummary,
  getReferenceEmpReportItemsHistorico,
  getUserInfo,
  listPortalUsers,
  openCempPortalActor,
  openCempPortalSession,
} from "../src/lib/ifs/cemp-portal";
import { getIfsTargetEmpNo } from "../src/lib/ifs/config";
import { fetchIfsAccessToken } from "../src/lib/ifs/auth";
import { getIfsConfig, getIfsDevBypassCredentials } from "../src/lib/ifs/config";
import { ifsFetch } from "../src/lib/ifs/client";
import {
  flattenReportItemRow,
  mapEmpReportItemToRegistro,
  mapEmployeeTimesheetToRegistros,
  mapReportItemsHistoricoToRegistros,
  parseEmpReportItems,
} from "../src/lib/ifs/tiempo-timesheet";
import {
  getHistoricoFechaMinimaIso,
  isRegistroHistorico,
  sortRegistrosHistorico,
} from "../src/lib/historico-tiempo";

async function accessToken(): Promise<{ email: string; token: string }> {
  const bypass = getIfsDevBypassCredentials();
  if (bypass) {
    return { email: bypass.email, token: bypass.accessToken };
  }
  const { accessToken } = await fetchIfsAccessToken();
  const target = getIfsTargetEmpNo() || "1001138468";
  try {
    const match = await findPortalUserByEmpId(accessToken, target);
    if (match?.EmailId) {
      return { email: match.EmailId, token: accessToken };
    }
  } catch {
    /* listar usuarios */
  }
  const users = await listPortalUsers(accessToken);
  const email =
    getIfsConfig().portalTestEmailId ||
    process.env.IFS_PORTAL_TEST_EMAIL ||
    users[0]?.EmailId ||
    "";
  if (!email) throw new Error("No hay EmailId de portal para abrir sesión IFS");
  return { email, token: accessToken };
}

function analyzeRaw(label: string, raw: unknown) {
  const rows = parseEmpReportItems(raw);
  let mappedOk = 0;
  let dropNoProy = 0;
  let dropHoras = 0;
  const fechas: string[] = [];
  const estados = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const flat = flattenReportItemRow(rows[i] as never);
    const fecha = (flat.AccountDate ?? "").slice(0, 10);
    if (fecha) fechas.push(fecha);
    const proy = flat.ShortName?.trim() || flat.ProjectId?.trim() || flat.Col2?.trim();
    const horas =
      typeof flat.Hours === "number"
        ? flat.Hours
        : Number.parseFloat(String(flat.Hours ?? "").replace(",", "."));
    if (!fecha || !proy) {
      dropNoProy += 1;
      continue;
    }
    if (!Number.isFinite(horas) || horas <= 0) {
      dropHoras += 1;
      continue;
    }
    const reg = mapEmpReportItemToRegistro(flat, i);
    if (!reg) continue;
    mappedOk += 1;
    estados.set(reg.estado, (estados.get(reg.estado) ?? 0) + 1);
  }

  fechas.sort();
  console.log(`\n=== ${label} ===`);
  console.log(`raw parseEmpReportItems: ${rows.length}`);
  console.log(`mapped OK: ${mappedOk} | drop sin proy: ${dropNoProy} | drop horas: ${dropHoras}`);
  console.log(
    `fechas: ${fechas[0] ?? "—"} … ${fechas[fechas.length - 1] ?? "—"}`,
  );
  console.log("estados:", Object.fromEntries(estados));
  return mapReportItemsHistoricoToRegistros(raw);
}

async function main() {
  const desdeIso = getHistoricoFechaMinimaIso();
  const targetEmp = getIfsTargetEmpNo() || "1001138468";
  console.log("desdeIso", desdeIso, "targetEmp", targetEmp);
  console.log("base", getIfsConfig().cempPortalBaseUrl);

  const { email, token } = await accessToken();
  console.log("session email", email);

  const ifs = await openCempPortalActor(email, token);
  const info = await getUserInfo(ifs);
  console.log("GetUserInfo", {
    EmpNo: info.EmpNo,
    CompanyId: info.CompanyId,
    ActivePeriod: info.ActivePeriod,
    EmpName: info.EmpName,
  });

  try {
    const summary = await getHoursSummary(ifs);
    console.log("GetHoursSummary", summary);
  } catch (e) {
    console.log("GetHoursSummary FAIL", e);
  }

  const collected = [];

  try {
    const sheet = await getEmployeeTimesheetForEmp(ifs, targetEmp);
    const regs = mapEmployeeTimesheetToRegistros(sheet, targetEmp);
    console.log(`\n=== Timesheet === rawMapped=${regs.length}`);
    if (regs[0]) console.log("sample", regs[0].fecha, regs[0].proy, regs[0].horas, regs[0].estado);
    collected.push(...regs);
  } catch (e) {
    console.log("Timesheet FAIL", e);
  }

  try {
    const raw = await getEmployeeReportItemsHistorico(ifs, desdeIso);
    collected.push(...analyzeRaw("ReportItemSet historico", raw));
  } catch (e) {
    console.log("ReportItemSet FAIL", e instanceof Error ? e.message : e);
  }

  const companyId = info.CompanyId?.trim() || ifs.user.CompanyId || "";
  const empNo = targetEmp || info.EmpNo?.trim() || "";
  try {
    const raw = await getReferenceEmpReportItemsHistorico(
      ifs,
      companyId,
      empNo,
      desdeIso,
    );
    collected.push(...analyzeRaw("Reference_EmpReportItem", raw));
  } catch (e) {
    console.log("Reference FAIL", e instanceof Error ? e.message : e);
  }

  // Reference without expand / top only EmpNo
  try {
    const emp = empNo.replace(/'/g, "''");
    const path = `/Reference_EmpReportItem?$filter=${encodeURIComponent(`EmpNo eq '${emp}'`)}&$top=5000&$orderby=AccountDate desc`;
    const raw = await ifsFetch(path, { accessToken: token });
    collected.push(...analyzeRaw("Reference EmpNo only (no expand)", raw));
  } catch (e) {
    console.log("Reference EmpNo-only FAIL", e instanceof Error ? e.message : e);
  }

  // Select more fields if possible
  try {
    const emp = empNo.replace(/'/g, "''");
    const path =
      `/Reference_EmpReportItem?$filter=${encodeURIComponent(`EmpNo eq '${emp}' and AccountDate ge date'${desdeIso}'`)}` +
      `&$select=CompanyId,EmpNo,AccountDate,Hours,Col2,ProjectTransactionSeq,Module,Objid,CStatus,CStatusDb` +
      `&$top=5000&$orderby=AccountDate desc`;
    const raw = await ifsFetch(path, { accessToken: token });
    collected.push(...analyzeRaw("Reference select+date filter", raw));
  } catch (e) {
    console.log("Reference select FAIL", e instanceof Error ? e.message : e);
  }

  const inWindow = sortRegistrosHistorico(collected as never);
  const hist = (collected as { estado: string; horas: number; fecha: string }[]).filter(
    (r) => isRegistroHistorico(r.estado as never),
  );
  console.log("\n=== TOTALES ===");
  console.log("collected (con dupes)", collected.length);
  console.log("isRegistroHistorico", hist.length, "horas", hist.reduce((s, r) => s + r.horas, 0));
  console.log("sortRegistrosHistorico", inWindow.length, "horas", inWindow.reduce((s, r) => s + r.horas, 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
