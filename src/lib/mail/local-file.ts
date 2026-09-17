import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function localMailInboxDir(): string {
  return path.join(process.cwd(), "tmp", "mail-inbox");
}

export async function sendMailViaLocalFile(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<string> {
  const dir = localMailInboxDir();
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const slug = input.to.replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
  const sub = input.subject.replace(/[^a-z0-9]+/gi, "-").slice(0, 24);
  const file = path.join(dir, `${stamp}-${slug}-${sub}.html`);
  const wrapped = input.html.replace(
    /<body([^>]*)>/i,
    `<body$1><p style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280;margin:0;padding:16px 12px 0;text-align:center;">Para: <strong>${input.to}</strong> · bandeja local (no salió a internet)</p>`,
  );
  await writeFile(file, wrapped, "utf8");
  return file;
}
