import {
  absolutePortalHref,
  getMailProvider,
  isMailAddressAllowed,
  isMailEnabled,
  normalizeMailAddress,
} from "@/src/lib/mail/config";
import { isGraphMailConfigured, sendMailViaGraph } from "@/src/lib/mail/graph";
import { sendMailViaLocalFile } from "@/src/lib/mail/local-file";
import { sendMailViaMailpit } from "@/src/lib/mail/mailpit";
import { buildMailHtml } from "@/src/lib/mail/template";

export type MailMessage = {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  href?: string;
  registrosCount?: number;
};

function mailHtml(message: MailMessage): string {
  return buildMailHtml({
    subject: message.subject,
    text: message.text,
    href: message.href,
    toName: message.toName,
    registrosCount: message.registrosCount,
  });
}

export { buildMailHtml } from "@/src/lib/mail/template";

/**
 * Entrega el correo o lo deja en log. Nunca lanza: un fallo de Outlook
 * no debe tumbar la aprobación.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const to = normalizeMailAddress(message.to);
  if (!to) {
    console.error("[correo] skip (sin destinatario)", message.subject);
    return;
  }

  const href = absolutePortalHref(message.href);
  const preview = {
    to,
    subject: message.subject,
    text: message.text,
    href,
  };

  if (!isMailEnabled()) {
    console.info("[correo] skip (MAIL_ENABLED=false)", preview);
    return;
  }

  if (!isMailAddressAllowed(to)) {
    console.info("[correo] skip (allowlist)", preview);
    return;
  }

  const provider = getMailProvider();
  if (provider === "local") {
    try {
      const file = await sendMailViaLocalFile({
        to,
        subject: message.subject,
        text: message.text,
        html: mailHtml(message),
      });
      console.info("[correo] guardado en bandeja local", {
        to,
        subject: message.subject,
        file,
      });
    } catch (error) {
      console.error("[correo] no se pudo guardar local", preview, error);
    }
    return;
  }

  if (provider === "mailpit") {
    try {
      await sendMailViaMailpit({
        to,
        toName: message.toName,
        subject: message.subject,
        text: message.text,
        html: mailHtml(message),
      });
      console.info("[correo] enviado (bandeja local)", {
        to,
        subject: message.subject,
        ver: `${process.env.MAILPIT_URL?.replace(/\/$/, "") || "http://localhost:8025"}`,
      });
    } catch (error) {
      console.error("[correo] Mailpit no está corriendo", preview, error);
    }
    return;
  }

  if (provider !== "graph") {
    console.info("[correo] (console)", preview);
    return;
  }

  if (!isGraphMailConfigured()) {
    console.error("[correo] Graph no configurado; no se envió", preview);
    return;
  }

  try {
    await sendMailViaGraph({
      to,
      toName: message.toName,
      subject: message.subject,
      text: message.text,
        html: mailHtml(message),
    });
    console.info("[correo] enviado", { to, subject: message.subject });
  } catch (error) {
    console.error("[correo] error al enviar", preview, error);
  }
}
