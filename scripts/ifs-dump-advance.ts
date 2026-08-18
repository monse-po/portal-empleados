/**
 * Dump CEmpAdvanceHandling OpenAPI / entity sets.
 * Uso: npx tsx scripts/ifs-dump-advance.ts
 */
import dotenv from "dotenv";
import { writeFileSync } from "node:fs";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env", override: true });

import { fetchIfsAccessToken } from "../src/lib/ifs/auth";
import { isIfsConfigured } from "../src/lib/ifs/config";

async function token(): Promise<string> {
  const bypass = process.env.IFS_DEV_ACCESS_TOKEN?.trim();
  if (bypass) return bypass;
  if (!isIfsConfigured()) throw new Error("Sin token IFS");
  return (await fetchIfsAccessToken()).accessToken;
}

async function main() {
  const accessToken = await token();
  const base =
    "https://hmvdev.ifs360.cloud/main/ifsapplications/projection/v1/CEmpAdvanceHandling.svc";
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  const svc = await fetch(`${base}/`, { headers });
  const svcJson = await svc.json();
  const names = (svcJson.value as { name: string; url: string }[]).map(
    (v) => `${v.name} -> ${v.url}`,
  );
  console.log("entity sets:\n" + names.join("\n"));

  const oa = await fetch(`${base}/$openapi?V3`, { headers });
  const text = await oa.text();
  writeFileSync("docs/ifs/CEmpAdvanceHandling.openapi.json", text);
  console.log("openapi status", oa.status, "bytes", text.length);

  const paths = Object.keys(JSON.parse(text).paths || {});
  console.log("paths:\n" + paths.join("\n"));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
