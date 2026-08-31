/**
 * Verifica ProjectTransactionSet → mapper de Mi Histórico.
 * Uso: npx tsx scripts/ifs-verify-pt-historico.ts
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env", override: true });

import { fetchIfsAccessToken } from "../src/lib/ifs/auth";
import { getProjectTransactionsHistorico } from "../src/lib/ifs/cemp-portal";
import { mapReportItemsHistoricoToRegistros } from "../src/lib/ifs/tiempo-timesheet";
import {
  getHistoricoFechaMinimaIso,
  getHistoricoResumenPorProyectoSub,
  sortRegistrosHistorico,
} from "../src/lib/historico-tiempo";

const EMP = "1001138468";

async function main() {
  const { accessToken } = await fetchIfsAccessToken();
  const desdeIso = getHistoricoFechaMinimaIso();
  const raw = await getProjectTransactionsHistorico(
    {
      emailId: "csruiz@h-mv.com",
      accessToken,
      etag: "",
      user: {},
      refreshEtag: async () => "",
    },
    EMP,
    desdeIso,
  );
  const mapped = mapReportItemsHistoricoToRegistros(raw);
  const enVentana = sortRegistrosHistorico(mapped);
  const hours = enVentana.reduce((s, r) => s + r.horas, 0);
  const fechas = enVentana.map((r) => r.fecha).sort();
  const byEstado = new Map<string, number>();
  for (const r of mapped) {
    byEstado.set(r.estado, (byEstado.get(r.estado) ?? 0) + 1);
  }
  console.log({
    desdeIso,
    rawCount: (raw as { "@odata.count"?: number })["@odata.count"],
    mapped: mapped.length,
    enVentana: enVentana.length,
    hours,
    desde: fechas[0],
    hasta: fechas[fechas.length - 1],
    estados: Object.fromEntries(byEstado),
    sample: enVentana.slice(0, 3).map((r) => ({
      fecha: r.fecha,
      horas: r.horas,
      proy: r.proy,
      proyNombre: r.proyNombre,
      subproy: r.subproy,
      act: r.act,
      estado: r.estado,
      id: r.id,
    })),
    resumenSample: getHistoricoResumenPorProyectoSub(enVentana)
      .slice(0, 3)
      .map((r) => ({
        codigo: r.codigo,
        nombre: r.nombre,
        subproy: r.subproy,
        actividad: r.actividad,
      })),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
