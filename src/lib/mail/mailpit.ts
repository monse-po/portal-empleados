import { getMailFrom, getMailFromName, getMailpitUrl } from "@/src/lib/mail/config";

/** Bandeja local (Docker Mailpit). No sale a internet. */
export async function sendMailViaMailpit(input: {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const url = `${getMailpitUrl()}/api/v1/send`;
  const from = getMailFrom() || "portal@localhost";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      From: { Email: from, Name: getMailFromName() },
      To: [{ Email: input.to, Name: input.toName || undefined }],
      Subject: input.subject,
      Text: input.text,
      HTML: input.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mailpit ${res.status}: ${body.slice(0, 240)}`);
  }
}
