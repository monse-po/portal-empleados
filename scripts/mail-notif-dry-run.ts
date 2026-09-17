/**
 * Dry-run del aviso por correo (no manda Outlook).
 *
 *   npx tsx scripts/mail-notif-dry-run.ts
 *   npx tsx scripts/mail-notif-dry-run.ts 1001138468
 *   npx tsx scripts/mail-notif-dry-run.ts --local liz.lino@veyron.com.mx
 *
 * `--local` guarda el HTML en tmp/mail-inbox/ (ábrelo en el navegador).
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env", override: true });

process.env.MAIL_ENABLED = "true";
process.env.MAIL_PORTAL_URL =
  process.env.MAIL_PORTAL_URL?.trim() || "http://localhost:3000";

function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

async function main() {
  const rawArgs = process.argv.slice(2).map((a) => a.trim()).filter(Boolean);
  const local = rawArgs.includes("--local");
  const args = rawArgs.filter((a) => a !== "--local");
  if (local) process.env.MAIL_PROVIDER = "local";
  else if (!process.env.MAIL_PROVIDER) process.env.MAIL_PROVIDER = "console";
  const emails = args.filter(looksLikeEmail).map((e) => e.toLowerCase());
  const empNos = args.filter((a) => !looksLikeEmail(a));

  const { sendMail } = await import("../src/lib/mail/send-mail");
  const { findPortalUserByEmpId } = await import(
    "../src/lib/ifs/cemp-portal"
  );
  const { fetchIfsAccessToken } = await import("../src/lib/ifs/auth");
  const { isIfsConfigured, getIfsTargetEmpNo } = await import(
    "../src/lib/ifs/config"
  );
  const { cempPortalUserPath, ifsFetch } = await import(
    "../src/lib/ifs/client"
  );

  const recipients =
    emails.length > 0 ? emails : ["prueba.empleado@h-mv.com"];
  process.env.MAIL_ALLOWLIST = recipients.join(",");

  console.log("Destinatarios de prueba:", recipients.join(", "));

  for (const to of recipients) {
    console.log(`\n→ Horas rechazadas a ${to}`);
    await sendMail({
      to,
      toName: to.startsWith("liz") ? "Liz Lino" : "Monse",
      subject: "Horas rechazadas",
      text: "Tus 8 h del 15/09/2026 en TIC1000 fueron rechazadas. · Motivo: prueba portal",
      href: "/hoja-tiempo",
    });
    console.log(`→ Anticipo aprobado a ${to}`);
    await sendMail({
      to,
      toName: to.startsWith("liz") ? "Liz Lino" : "Monse",
      subject: "Anticipo aprobado",
      text: "Se aprobó tu anticipo en TIC1000.",
      href: "/mis-anticipos",
    });
  }

  if (!isIfsConfigured()) {
    console.log("\nIFS no configurado: no se pudo confirmar EmailId.");
    return;
  }

  const { accessToken } = await fetchIfsAccessToken();

  if (emails.length) {
    console.log("\n¿Existen en IFS (CEmpPortalUserSet)?");
    for (const email of emails) {
      try {
        const user = await ifsFetch<{ EmailId?: string; EmpId?: string }>(
          `${cempPortalUserPath(email)}?$select=EmailId,CompanyId,EmpId`,
          { accessToken },
        );
        console.log(`  ${email} → EmpId ${user.EmpId ?? "?"} (sí está)`);
      } catch {
        console.log(`  ${email} → no hay fila en IFS con ese EmailId`);
      }
    }
  }

  const empNo = empNos[0] || (!emails.length ? getIfsTargetEmpNo() : "");
  if (!empNo) return;

  console.log(`\nLookup EmpNo=${empNo}`);
  const user = await findPortalUserByEmpId(accessToken, empNo);
  if (!user?.EmailId) {
    console.log("IFS no devolvió EmailId para ese EmpNo.");
    return;
  }
  console.log("  EmpId:", user.EmpId);
  console.log("  EmailId:", user.EmailId);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
