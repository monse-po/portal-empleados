import {
  getReportCost,
  type CempPortalSession,
} from "@/src/lib/ifs/cemp-portal";
import {
  assertPortalPuedeMutarTipoHora,
  isColombiaCompany,
} from "@/src/lib/tiempo-ausencias";

/** Colombia: bloquea tipos que IFS marca ausencia (grupo/tipo), no un proyecto fijo. */
export async function assertPuedeMutarTipoEnIfs(
  ifs: CempPortalSession,
  tipo: string,
): Promise<void> {
  const companyId = ifs.user.CompanyId;
  assertPortalPuedeMutarTipoHora(tipo, companyId);
  if (!isColombiaCompany(companyId)) return;
  const cost = await getReportCost(ifs.accessToken, companyId, tipo);
  assertPortalPuedeMutarTipoHora(tipo, companyId, {
    code: tipo,
    groupId: cost?.ReportCostGroupId,
    groupType: cost?.CReportCostGrpType,
  });
}
