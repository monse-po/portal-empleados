/**
 * Prueba rápida: token IDCS → CEmpPortalServices.
 * Uso: npx tsx scripts/ifs-smoke-test.ts [EmailId]
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env", override: true });

import { fetchIfsAccessToken } from "../src/lib/ifs/auth";
import { getIfsConfig, isIfsConfigured } from "../src/lib/ifs/config";
import {
  getUserInfo,
  listPortalUsers,
  openCempPortalSession,
} from "../src/lib/ifs/cemp-portal";

async function main() {
  const cfg = getIfsConfig();
  console.log("IFS base:", cfg.cempPortalBaseUrl);
  console.log("Token URL:", cfg.oauthTokenUrl);
  console.log("Client ID:", cfg.oauthClientId ? "(set)" : "(missing)");

  if (!isIfsConfigured()) {
    console.error("Faltan IFS_IDCS_CLIENT_ID / SECRET / DOMAIN_URL en .env.local");
    process.exit(1);
  }

  const { accessToken } = await fetchIfsAccessToken();
  console.log("Token OK (client_credentials)");

  const users = await listPortalUsers(accessToken);
  console.log(`CEmpPortalUserSet: ${users.length} usuario(s)`);
  for (const u of users.slice(0, 5)) {
    console.log(`  - ${u.EmailId} (${u.CompanyId} / ${u.EmpId})`);
  }

  const emailId =
    process.argv[2]?.trim() ||
    cfg.portalTestEmailId ||
    users[0]?.EmailId;

  if (!emailId) {
    console.log(
      "Sin EmailId: pasa uno como argumento o define IFS_PORTAL_TEST_EMAIL",
    );
    return;
  }

  const session = await openCempPortalSession(emailId, accessToken);
  const info = await getUserInfo(session);
  console.log(`GetUserInfo(${emailId}):`, {
    EmpNo: info.EmpNo,
    EmpName: info.EmpName,
    CompanyId: info.CompanyId,
    CompanyName: info.CompanyName,
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  if (err && typeof err === "object" && "body" in err) {
    const body = String((err as { body: string }).body);
    console.error(body.slice(0, 500));
    if (body.includes("401") || body.includes("Authorization Required")) {
      console.error(
        "\nNota: el token IDCS se obtuvo, pero IFS rechazó la API (401).",
        "Confirma con TI que el IAM client tenga acceso a CEmpPortalServices",
        "o si el token debe salir del realm hmvdev (no solo IDCS).",
      );
    }
  }
  process.exit(1);
});
