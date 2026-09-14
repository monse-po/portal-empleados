/**
 * Comprueba si CDSERequestHandling ya está publicado en IFS.
 * No imprime tokens. Uso: npx tsx scripts/ifs-probe-dse-request.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env", override: true });

import { fetchIfsAccessToken } from "../src/lib/ifs/auth";
import { getIfsConfig, isIfsConfigured } from "../src/lib/ifs/config";

const NAMES = [
  "CDSERequestHandling",
  "CDSERequestServices",
  "CEmpDSERequestHandling",
  "CDseRequestHandling",
  "CDseRequestSet",
];

const ENTITY_SETS = ["CDseRequestSet", "CDSERequestSet", "DseRequestSet"];

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
  return { status: res.status, text };
}

function hostFromConfig(): string {
  const cfg = getIfsConfig();
  return cfg.cempPortalBaseUrl.replace(
    /\/int\/ifsapplications\/projection\/v1\/CEmpPortalServices\.svc.*/i,
    "",
  );
}

function summarizeOpenApi(json: unknown) {
  const spec = json as {
    paths?: Record<string, Record<string, unknown>>;
    components?: { schemas?: Record<string, unknown> };
  };
  const paths = Object.keys(spec.paths ?? {});
  const entitySets = paths
    .filter((p) => !p.includes("(") && !p.includes("/IfsApp."))
    .sort();
  const actions = paths.filter((p) => p.includes("/IfsApp.")).sort();
  const functions = paths.filter((p) => p.includes("(") && !p.includes("/IfsApp.")).sort();
  const schemas = Object.keys(spec.components?.schemas ?? {})
    .filter((k) => !k.startsWith("IfsApp.") && !k.includes("Collection"))
    .sort();
  return { paths, entitySets, actions, functions, schemas };
}

async function main() {
  const host = (process.env.IFS_PROBE_HOST || hostFromConfig()).replace(/\/$/, "");
  const accessToken = await token();
  console.log("Host:", host);
  console.log(
    "Token source:",
    process.env.IFS_DEV_ACCESS_TOKEN ? "dev-bypass" : "client_credentials",
  );

  let found: { channel: string; name: string } | null = null;

  for (const name of NAMES) {
    for (const ch of ["int", "main"] as const) {
      const url = `${host}/${ch}/ifsapplications/projection/v1/${name}.svc/`;
      const r = await hit(url, accessToken);
      if (r.status === 404) continue;
      console.log(`${r.status} ${ch}/${name} :: ${r.text.slice(0, 220).replace(/\s+/g, " ")}`);
      if (r.status === 200 && !found) found = { channel: ch, name };
    }
  }

  for (const ch of ["int", "main"] as const) {
    const explorer = `${host}/${ch}/ifsapplications/projection/v1/FndApiExplorer.svc/ProjectionSet?$filter=contains(tolower(Name),'dse') or contains(tolower(Name),'cdse')&$top=30`;
    const r = await hit(explorer, accessToken);
    console.log(`explorer ${ch}`, r.status, r.text.slice(0, 400).replace(/\s+/g, " "));
  }

  if (!found) {
    console.log("NO_PROJECTION CDSERequestHandling (ni alias) — 404 en int/ y main/");
    return;
  }

  const base = `${host}/${found.channel}/ifsapplications/projection/v1/${found.name}.svc`;
  const openapi = await hit(`${base}/$openapi?V3`, accessToken);
  console.log("OpenAPI", openapi.status, `${found.channel}/${found.name}`);
  if (openapi.status !== 200) {
    console.log(openapi.text.slice(0, 400));
    return;
  }

  const spec = JSON.parse(openapi.text) as unknown;
  const sum = summarizeOpenApi(spec);
  console.log("entitySets:", sum.entitySets.join(" | ") || "(ninguno)");
  console.log("functions:", sum.functions.join(" | ") || "(ninguna)");
  console.log("actions:", sum.actions.join(" | ") || "(ninguna)");
  console.log("schemas:", sum.schemas.join(" | ") || "(ninguno)");

  const out = resolve("docs/ifs/CDSERequestHandling.openapi.json");
  writeFileSync(out, JSON.stringify(spec, null, 2) + "\n");
  console.log("Wrote", out);

  const hasRequestSet = sum.entitySets.some((p) =>
    /CDseRequestSet|CDSERequestSet/i.test(p),
  );
  console.log("CDseRequestSet in OpenAPI:", hasRequestSet ? "YES" : "NO");

  for (const set of ENTITY_SETS) {
    const r = await hit(`${base}/${set}?$top=2`, accessToken);
    const snippet = r.text.slice(0, 280).replace(/\s+/g, " ");
    console.log(`GET /${set} → ${r.status} ${snippet}`);
  }

  const sampleSets = sum.entitySets
    .filter((p) => p !== "/" && !p.endsWith("$metadata"))
    .slice(0, 8);
  for (const path of sampleSets) {
    const r = await hit(`${base}${path}?$top=2`, accessToken);
    const snippet = r.text.slice(0, 280).replace(/\s+/g, " ");
    console.log(`GET ${path} → ${r.status} ${snippet}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
