/**
 * Busca en IFS una proyección/API de Employee Advances.
 * No imprime tokens. Uso: npx tsx scripts/ifs-probe-advances.ts
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env", override: true });

import { fetchIfsAccessToken } from "../src/lib/ifs/auth";
import { getIfsConfig, isIfsConfigured } from "../src/lib/ifs/config";

const CANDIDATES = [
  "EmployeeAdvanceHandling",
  "EmployeeAdvancesHandling",
  "CEmpAdvanceHandling",
  "CEmployeeAdvanceHandling",
  "CEmpPortalAdvanceServices",
  "EmpAdvanceHandling",
  "EmployeePaymentHandling",
  "EmpPaymentHandling",
  "TravelExpenseHandling",
  "ExpenseSheetHandling",
  "ManSuppInvoiceHandling",
  "InstantInvoiceHandling",
  "MixedPaymentHandling",
  "SupplierInvoiceHandling",
  "PrepaymentInvoiceHandling",
  "EmployeeEmpCompensationEmployeeBusinessObject",
];

async function token(): Promise<string> {
  const bypass = process.env.IFS_DEV_ACCESS_TOKEN?.trim();
  if (bypass) return bypass;
  if (!isIfsConfigured()) {
    throw new Error("Sin IFS_DEV_ACCESS_TOKEN ni client credentials");
  }
  const { accessToken } = await fetchIfsAccessToken();
  return accessToken;
}

async function hit(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const text = await res.text();
  return { status: res.status, snippet: text.slice(0, 180).replace(/\s+/g, " ") };
}

async function main() {
  const cfg = getIfsConfig();
  const accessToken = await token();
  const host = cfg.cempPortalBaseUrl.replace(
    /\/int\/ifsapplications\/projection\/v1\/CEmpPortalServices\.svc.*/i,
    "",
  );
  console.log("Host:", host);
  console.log("Token source:", process.env.IFS_DEV_ACCESS_TOKEN ? "dev-bypass" : "client_credentials");

  const openapiUrl = `${cfg.cempPortalBaseUrl.replace(/\/$/, "")}/$openapi?V3`;
  const live = await hit(openapiUrl, accessToken);
  console.log("CEmpPortalServices $openapi:", live.status, live.snippet.slice(0, 80));
  if (live.status === 200) {
    const keys = [...live.snippet.matchAll(/"(\/[^"]*(?:Advance|Expense|Request|Payment)[^"]*)"/gi)].map(
      (m) => m[1],
    );
    console.log("OpenAPI snippet matches:", keys.slice(0, 20));
  }

  for (const name of CANDIDATES) {
    for (const ch of ["int", "main"] as const) {
      const url = `${host}/${ch}/ifsapplications/projection/v1/${name}.svc/`;
      const r = await hit(url, accessToken);
      if (r.status !== 404 && r.status !== 0) {
        console.log(`${r.status} ${ch}/${name} :: ${r.snippet}`);
      }
    }
  }

  const explorerUrls = [
    `${host}/main/ifsapplications/projection/v1/FndApiExplorer.svc/ProjectionSet?$top=5`,
    `${host}/main/ifsapplications/projection/v1/ApiExplorerHandling.svc/`,
    `${host}/int/ifsapplications/projection/v1/FndApiExplorer.svc/`,
  ];
  for (const url of explorerUrls) {
    const r = await hit(url, accessToken);
    console.log("explorer", r.status, url.split("/projection/")[1], r.snippet.slice(0, 100));
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
