/**
 * Busca APIs/proyecciones alternativas con histórico de horas.
 * Uso: npx tsx scripts/ifs-discover-historico-apis.ts
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env", override: true });

import { fetchIfsAccessToken } from "../src/lib/ifs/auth";
import { getIfsConfig } from "../src/lib/ifs/config";
import {
  findPortalUserByEmpId,
  getApprovalTimesheets,
  getUserInfo,
  openCempPortalActor,
} from "../src/lib/ifs/cemp-portal";
import { ifsFetch } from "../src/lib/ifs/client";
import { parseEmpReportItems } from "../src/lib/ifs/tiempo-timesheet";

const EMP = "1001138468";
const DESDE = "2025-08-31";

async function tryGet(
  label: string,
  fn: () => Promise<unknown>,
): Promise<unknown | null> {
  try {
    const raw = await fn();
    const rows = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { value?: unknown[] })?.value)
        ? (raw as { value: unknown[] }).value
        : null;
    const count =
      (raw as { "@odata.count"?: number })?.["@odata.count"] ??
      rows?.length ??
      (raw ? "obj" : 0);
    console.log(`OK  ${label} → count/len=${count}`);
    if (rows?.[0] && typeof rows[0] === "object") {
      const keys = Object.keys(rows[0] as object).filter((k) => !k.startsWith("@"));
      console.log(`    keys: ${keys.slice(0, 18).join(", ")}`);
      const sample = rows[0] as Record<string, unknown>;
      const hint = [
        sample.AccountDate,
        sample.EmpNo,
        sample.Hours,
        sample.ShortName,
        sample.ProjectId,
        sample.ProjectTransactionSeq,
        sample.CStatusDb,
      ]
        .filter((v) => v != null && v !== "")
        .join(" | ");
      if (hint) console.log(`    sample: ${hint}`);
    } else if (raw && typeof raw === "object" && !rows) {
      console.log(`    keys: ${Object.keys(raw as object).slice(0, 12).join(", ")}`);
    }
    return raw;
  } catch (e) {
    console.log(`FAIL ${label} → ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

async function main() {
  const cfg = getIfsConfig();
  const intBase = cfg.cempPortalBaseUrl.replace(/\/$/, "");
  const mainBase = intBase.replace("/int/", "/main/");
  const rootInt = intBase.replace(/\/CEmpPortalServices\.svc$/, "");
  const rootMain = mainBase.replace(/\/CEmpPortalServices\.svc$/, "");

  console.log("int", intBase);
  console.log("main", mainBase);

  const { accessToken } = await fetchIfsAccessToken();
  const match = await findPortalUserByEmpId(accessToken, EMP);
  if (!match?.EmailId) throw new Error("sin EmailId para EmpNo");
  const ifs = await openCempPortalActor(match.EmailId, accessToken);
  const info = await getUserInfo(ifs);
  console.log("user", info.EmpNo, info.ActivePeriod, info.CompanyId, match.EmailId);

  // 1) Approval timesheets (gerente) — a veces ve más que el timesheet del periodo
  await tryGet("GetApprovalTimesheets", () => getApprovalTimesheets(ifs));

  // 2) EmpReportItem count + date variants
  for (const [label, filter] of [
    ["ER EmpNo count", `EmpNo eq '${EMP}'`],
    [
      "ER EmpNo+date",
      `EmpNo eq '${EMP}' and AccountDate ge date'${DESDE}'`,
    ],
    ["ER Company+EmpNo", `CompanyId eq 'HMVINGCO' and EmpNo eq '${EMP}'`],
  ] as const) {
    await tryGet(label, () =>
      ifsFetch(
        `/Reference_EmpReportItem?$filter=${encodeURIComponent(filter)}&$count=true&$top=5&$orderby=AccountDate desc`,
        { accessToken },
      ),
    );
  }

  // 3) ProjectTransaction with expands / select guesses
  for (const expand of [
    undefined,
    "EmpReportItemRef",
    "ReportItemRef",
    "EmployeeRef",
    "ProjectRef",
    "ActivityRef",
  ]) {
    const q = expand
      ? `/Reference_ProjectTransaction?$top=3&$expand=${expand}&$orderby=ProjectTransactionSeq desc`
      : `/Reference_ProjectTransaction?$top=3&$orderby=ProjectTransactionSeq desc`;
    await tryGet(`PT expand=${expand ?? "none"}`, () =>
      ifsFetch(q, { accessToken }),
    );
  }

  // 4) Known confirmed seq — try expand
  for (const expand of ["EmpReportItemArray", "EmpReportItems", "ReportItems"]) {
    await tryGet(`PT 512481 expand=${expand}`, () =>
      ifsFetch(
        `/Reference_ProjectTransaction(ProjectTransactionSeq=512481)?$expand=${expand}`,
        { accessToken },
      ),
    );
  }

  // 5) Discover sibling projections (common IFS names)
  const candidates = [
    "CEmpBulkTimeApprovalHandling",
    "CEmpTimeReporting",
    "ProjectTransactionHandling",
    "TimeReporting",
    "EmployeeTimeReporting",
    "PrjReport",
    "ProjectReporting",
    "TimeSheet",
    "EmpTimeSheet",
    "CEmpTimeSheet",
    "TimeRegistration",
    "ProjectTransactionsHandling",
    "ReportTransactionHandling",
    "EmployeeReporting",
    "CEmpPortalServices",
  ];

  for (const base of [rootInt, rootMain]) {
    console.log(`\n--- discover projections under ${base} ---`);
    for (const name of candidates) {
      const url = `${base}/${name}.svc`;
      await tryGet(`GET ${name}.svc`, async () => {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 120)}`);
        try {
          return JSON.parse(text);
        } catch {
          return { raw: text.slice(0, 200) };
        }
      });
      await tryGet(`GET ${name}.svc/$openapi?V3`, async () => {
        const res = await fetch(`${url}/$openapi?V3`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`${res.status}`);
        const spec = JSON.parse(text) as {
          paths?: Record<string, unknown>;
          components?: { schemas?: Record<string, unknown> };
        };
        const paths = Object.keys(spec.paths ?? {});
        const schemas = Object.keys(spec.components?.schemas ?? {});
        const hitPaths = paths.filter((p) =>
          /report|time|hour|trans|emp|project|sheet/i.test(p),
        );
        console.log(
          `    openapi paths=${paths.length} schemas=${schemas.length} hitPaths=${hitPaths.slice(0, 8).join(" | ")}`,
        );
        return { paths: hitPaths.slice(0, 15), schemas: schemas.filter((s) => /report|time|trans|emp|project/i.test(s)).slice(0, 20) };
      });
    }
  }

  // 6) main channel EmpReportItem count
  await tryGet("main ER EmpNo count", () =>
    ifsFetch(
      `/Reference_EmpReportItem?$filter=${encodeURIComponent(`EmpNo eq '${EMP}'`)}&$count=true&$top=5`,
      { accessToken, baseUrl: mainBase },
    ),
  );

  // 7) Approval timesheet parsed size
  const apro = await tryGet("GetApprovalTimesheets parsed", async () => {
    const raw = await getApprovalTimesheets(ifs);
    const rows = parseEmpReportItems(raw);
    return { value: rows, "@odata.count": rows.length };
  });
  void apro;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
