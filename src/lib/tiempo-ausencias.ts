import { TIEMPO_JORNADA_POR_COMPANIA } from "@/src/lib/tiempo-config";

/**
 * Códigos de ausencia Colombia (AUSGEN + EXCEP).
 * Chile/Perú pueden tener los mismos códigos en el LOV IFS.
 */
export const AUSENCIA_REPORT_CODES = ["INMED", "VACAC", "AUSGE"] as const;

/** INMED (grupo EXCEP): se puede reportar en fin de semana y festivo. */
const AUSENCIA_EXCEP_NO_LABORABLE = new Set(["INMED"]);

const COLOMBIA_COMPANY_IDS = new Set(["HMVINGCO"]);

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

/** INMED sí en día no hábil; VACAC/AUSGE no. */
export function isAusenciaExcepcionNoLaborable(
  code: string | null | undefined,
): boolean {
  return AUSENCIA_EXCEP_NO_LABORABLE.has((code ?? "").trim().toUpperCase());
}

/**
 * Chile y Perú registran ausencias en el portal.
 * Colombia las recibe por la API Absence Receive (Midasoft), no por EmpPortalTimeRegList.
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
): boolean {
  if (!isAusenciaReportCode(tipo)) return true;
  return portalPuedeRegistrarAusencias(companyId);
}

export function filterTiposAusenciaPortal<T extends { code: string }>(
  tipos: T[],
  companyId: string | null | undefined,
): T[] {
  if (portalPuedeRegistrarAusencias(companyId)) return tipos;
  return tipos.filter((tipo) => !isAusenciaReportCode(tipo.code));
}

export const MSG_AUSENCIA_COLOMBIA_PORTAL =
  "En Colombia las ausencias (vacaciones, incapacidades y permisos) se cargan por integración, no desde el portal.";

export function assertPortalPuedeMutarTipoHora(
  tipo: string,
  companyId: string | null | undefined,
): void {
  if (!portalPuedeMutarTipoHora(tipo, companyId)) {
    throw new Error(MSG_AUSENCIA_COLOMBIA_PORTAL);
  }
}
