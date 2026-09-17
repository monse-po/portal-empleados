import { TIEMPO_JORNADA_POR_COMPANIA } from "@/src/lib/tiempo-config";

/**
 * Ausencias según **IFS**, no según un proyecto fijo (GA3004, etc.).
 *
 * - Chile/Perú: el empleado registra en las actividades que `GetValidEmpPrjAct`
 *   le asigne; el tipo lo da `GetValidActReportCode` (suele ser DN).
 * - Colombia: el portal no muta códigos cuyo LOV/ReportCost IFS marca ausencia
 *   (`CReportCostGrpType=ABSENCE` o grupos AUSGEN/EXCEP).
 *
 * La lista de códigos es solo fallback si IFS no manda grupo.
 */
export const AUSENCIA_REPORT_CODES = ["INMED", "VACAC", "AUSGE"] as const;

const IFS_AUSENCIA_GROUP_TYPE = "ABSENCE";
const IFS_AUSENCIA_GROUP_IDS = new Set(["AUSGEN", "EXCEP"]);

const COLOMBIA_COMPANY_IDS = new Set(["HMVINGCO"]);

export type AusenciaIfsMeta = {
  code?: string | null;
  groupId?: string | null;
  groupType?: string | null;
};

export function normalizeCompanyId(
  raw: string | null | undefined,
): string {
  if (!raw) return "";
  const trimmed = raw.trim().toUpperCase();
  const token = trimmed.split(/[\s–—-]/)[0] ?? "";
  const compact = token.replace(/[^A-Z0-9]/g, "");
  return compact || trimmed;
}

export function isColombiaCompany(
  companyId: string | null | undefined,
): boolean {
  const id = normalizeCompanyId(companyId);
  if (!id) return false;
  if (COLOMBIA_COMPANY_IDS.has(id)) return true;
  const cfg = TIEMPO_JORNADA_POR_COMPANIA[id];
  if (cfg?.pais === "CO") return true;
  return /INGCO$/.test(id);
}

export function isAusenciaReportCode(
  code: string | null | undefined,
): boolean {
  const c = (code ?? "").trim().toUpperCase();
  return (AUSENCIA_REPORT_CODES as readonly string[]).includes(c);
}

/** Clasifica con metadatos IFS (grupo/tipo); si faltan, usa el código. */
export function isAusenciaIfsMeta(meta: AusenciaIfsMeta): boolean {
  const type = (meta.groupType ?? "").trim().toUpperCase();
  if (type === IFS_AUSENCIA_GROUP_TYPE) return true;
  const group = (meta.groupId ?? "").trim().toUpperCase();
  if (IFS_AUSENCIA_GROUP_IDS.has(group)) return true;
  return isAusenciaReportCode(meta.code);
}

/** INMED / grupo EXCEP: se puede reportar en día no hábil. */
export function isAusenciaExcepcionNoLaborable(
  code?: string | null,
  groupId?: string | null,
): boolean {
  if ((groupId ?? "").trim().toUpperCase() === "EXCEP") return true;
  return (code ?? "").trim().toUpperCase() === "INMED";
}

/**
 * Chile y Perú registran ausencias en el portal (actividad IFS + tipo del LOV).
 * Colombia las recibe por Absence Receive (Midasoft).
 */
export function portalPuedeRegistrarAusencias(
  companyId: string | null | undefined,
): boolean {
  if (!companyId?.trim()) return true;
  return !isColombiaCompany(companyId);
}

export function portalPuedeMutarTipoHora(
  tipo: string,
  companyId: string | null | undefined,
  meta?: AusenciaIfsMeta,
): boolean {
  if (!isAusenciaIfsMeta({ code: tipo, ...meta })) return true;
  return portalPuedeRegistrarAusencias(companyId);
}

export function filterTiposAusenciaPortal<
  T extends AusenciaIfsMeta & { code: string },
>(tipos: T[], companyId: string | null | undefined): T[] {
  if (portalPuedeRegistrarAusencias(companyId)) return tipos;
  return tipos.filter((tipo) => !isAusenciaIfsMeta(tipo));
}

export const MSG_AUSENCIA_COLOMBIA_PORTAL =
  "En Colombia las ausencias (vacaciones, incapacidades y permisos) se cargan por integración, no desde el portal.";

export function assertPortalPuedeMutarTipoHora(
  tipo: string,
  companyId: string | null | undefined,
  meta?: AusenciaIfsMeta,
): void {
  if (!portalPuedeMutarTipoHora(tipo, companyId, meta)) {
    throw new Error(MSG_AUSENCIA_COLOMBIA_PORTAL);
  }
}
