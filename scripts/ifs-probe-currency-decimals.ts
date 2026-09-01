import { fetchIfsAccessToken } from "../src/lib/ifs/auth";

/**
 * Diagnóstico: GetCurrencyCodes (portal) vs CurrencyCodesHandling.CurrencyRounding.
 * Uso: npx tsx scripts/ifs-probe-currency-decimals.ts
 */
async function main() {
  const { accessToken } = await fetchIfsAccessToken();
  const { getCurrencyCodes } = await import("../src/lib/ifs/cemp-portal");
  const { getCompanyCurrencyFormats } = await import(
    "../src/lib/ifs/currency-codes-handling"
  );

  const company = process.env.IFS_PROBE_COMPANY || "HMVINGCO";
  const portal = await getCurrencyCodes(accessToken, company);
  console.log("GetCurrencyCodes", portal.length, portal[0] ? Object.keys(portal[0]) : []);
  console.log(portal);

  const detailed = await getCompanyCurrencyFormats(accessToken, company);
  console.log("\nCurrencyCodesHandling", detailed);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
