/**
 * Genera los HTML de todos los avisos (bandeja local).
 *
 *   npx tsx scripts/mail-preview-templates.ts
 */
import dotenv from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env", override: true });

process.env.MAIL_PORTAL_URL =
  process.env.MAIL_PORTAL_URL?.trim() || "http://localhost:3000";

async function main() {
  const { buildMailHtml, MAIL_PREVIEW_SCENARIOS } = await import(
    "../src/lib/mail/template"
  );

  const dir = path.join(process.cwd(), "tmp", "mail-inbox");
  await mkdir(dir, { recursive: true });

  const files: string[] = [];
  for (const item of MAIL_PREVIEW_SCENARIOS) {
    const html = buildMailHtml({
      subject: item.subject,
      text: item.text,
      href: item.href,
      toName: item.toName,
      registrosCount: item.registrosCount,
    });
    const file = path.join(dir, `preview-${item.id}.html`);
    await writeFile(file, html, "utf8");
    files.push(file);
    console.log(" ", item.id, "→", file);
  }

  console.log(`\n${files.length} plantillas en tmp/mail-inbox/preview-*.html`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
