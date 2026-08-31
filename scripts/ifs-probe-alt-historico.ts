/**
 * Sonda las proyecciones /main/ que sí existen:
 * CEmpBulkTimeApprovalHandling + ProjectTransactionsHandling
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env", override: true });

import { fetchIfsAccessToken } from "../src/lib/ifs/auth";
import { getIfsConfig } from "../src/lib/ifs/config";

const EMP = "1001138468";
const COMPANY = "HMVINGCO";

type OpenApi = {
  paths?: Record<string, unknown>;
  components?: { schemas?: Record<string, { properties?: Record<string, unknown> }> };
};

async function getJson(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 240)}`);
  return text ? JSON.parse(text) : null;
}

function summarizeRow(row: Record<string, unknown>) {
  const pick = [
    "AccountDate",
    "ReportDate",
    "TransactionDate",
    "DateCreated",
    "EmpNo",
    "EmployeeId",
    "Hours",
    "Quantity",
    "InternalQuantity",
    "ProjectId",
    "SubProjectId",
    "ActivitySeq",
    "ShortName",
    "ProjectTransactionSeq",
    "CStatus",
    "CStatusDb",
    "Objstate",
    "Rowstate",
  ];
  return pick
    .filter((k) => row[k] != null && row[k] !== "")
    .map((k) => `${k}=${row[k]}`)
    .join(" | ");
}

async function probeEntity(
  label: string,
  url: string,
  token: string,
) {
  try {
    const raw = await getJson(url, token);
    const rows = Array.isArray(raw?.value) ? raw.value : Array.isArray(raw) ? raw : [];
    const count = raw?.["@odata.count"] ?? rows.length;
    console.log(`OK  ${label} → count=${count} url=${url.split(".svc")[1] ?? url}`);
    if (rows[0]) {
      const keys = Object.keys(rows[0]).filter((k) => !k.startsWith("@"));
      console.log(`    keys(${keys.length}): ${keys.join(", ")}`);
      console.log(`    sample: ${summarizeRow(rows[0])}`);
      if (rows.length > 1) {
        console.log(`    last:   ${summarizeRow(rows[rows.length - 1])}`);
      }
    }
    return { count, rows };
  } catch (e) {
    console.log(`FAIL ${label} → ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

async function main() {
  const { accessToken } = await fetchIfsAccessToken();
  const cfg = getIfsConfig();
  const mainRoot = cfg.cempPortalBaseUrl
    .replace(/\/$/, "")
    .replace("/int/", "/main/")
    .replace(/\/CEmpPortalServices\.svc$/, "");

  for (const name of ["CEmpBulkTimeApprovalHandling", "ProjectTransactionsHandling"]) {
    const spec = (await getJson(`${mainRoot}/${name}.svc/$openapi?V3`, accessToken)) as OpenApi;
    const paths = Object.keys(spec.paths ?? {}).sort();
    const collections = paths.filter((p) => !p.includes("(") && !p.includes("$"));
    console.log(`\n======== ${name} collections (${collections.length}) ========`);
    for (const p of collections) console.log(`  ${p}`);

    const interesting = collections.filter((p) =>
      /emp|report|time|hour|trans|sheet|period|approval|history|hist/i.test(p),
    );
    console.log(`\n-- interesting --`);
    for (const p of interesting) {
      const schemaName = p.replace(/^\//, "");
      const schema = spec.components?.schemas?.[schemaName];
      const props = Object.keys(schema?.properties ?? {});
      const hits = props.filter((k) =>
        /emp|date|hour|qty|project|status|period|seq|company/i.test(k),
      );
      console.log(`  ${p} props=${props.length} hits=${hits.slice(0, 20).join(", ")}`);
    }
  }

  const bulk = `${mainRoot}/CEmpBulkTimeApprovalHandling.svc`;
  const pth = `${mainRoot}/ProjectTransactionsHandling.svc`;

  console.log("\n======== queries CEmpBulkTimeApprovalHandling ========");
  for (const q of [
    `/EmpBulkTimeApprovalSet?$top=5&$count=true`,
    `/EmpBulkTimeApprovalSet?$filter=${encodeURIComponent(`EmpNo eq '${EMP}'`)}&$count=true&$top=20`,
    `/Reference_EmpBulkTimeApproval?$top=5&$count=true`,
    `/Reference_EmpBulkTimeApproval?$filter=${encodeURIComponent(`EmpNo eq '${EMP}'`)}&$count=true&$top=20`,
  ]) {
    await probeEntity(q.split("?")[0] + (q.includes("EmpNo") ? " EmpNo" : " top"), `${bulk}${q}`, accessToken);
  }

  // Dump first-level entity set names from service root
  const pthRoot = await getJson(pth, accessToken);
  const names = (pthRoot?.value ?? []).map((x: { name?: string }) => x.name).filter(Boolean);
  console.log(`\n======== ProjectTransactionsHandling entity sets (${names.length}) ========`);
  for (const n of names) console.log(`  ${n}`);

  const empish = names.filter((n: string) =>
    /emp|report|time|hour|trans|sheet|period|hist|item/i.test(n),
  );
  console.log("\n======== queries ProjectTransactionsHandling ========");
  for (const n of empish) {
    await probeEntity(`${n} top5`, `${pth}/${n}?$top=5&$count=true`, accessToken);
    for (const filter of [
      `EmpNo eq '${EMP}'`,
      `EmployeeId eq '${EMP}'`,
      `CompanyId eq '${COMPANY}' and EmpNo eq '${EMP}'`,
    ]) {
      await probeEntity(
        `${n} ${filter.split(" ")[0]}`,
        `${pth}/${n}?$filter=${encodeURIComponent(filter)}&$count=true&$top=10&$orderby=ProjectTransactionSeq desc`,
        accessToken,
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
