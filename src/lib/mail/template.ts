import { HMV_LOGO_SRC } from "@/src/lib/hmv-logo";
import { absolutePortalHref } from "@/src/lib/mail/config";

const NAVY = "#014783";
const BG = "#f5f7fa";
const TEXT = "#111111";
const COPY = "#4b5563";
const MUTED = "#6b7280";
const BORDER = "#e5e9f0";

export type MailTone = "aprobado" | "rechazado" | "anulado";

const TONE: Record<MailTone, { bg: string; fg: string; label: string }> = {
  aprobado: { bg: "#bbf7d0", fg: "#15803d", label: "Aprobado" },
  rechazado: { bg: "#fee2e2", fg: "#b91c1c", label: "Rechazado" },
  anulado: { bg: "#d1d5db", fg: "#374151", label: "Anulado" },
};

export function mailToneFromSubject(subject: string): MailTone {
  const s = subject.toLowerCase();
  if (s.includes("rechaz")) return "rechazado";
  if (s.includes("anul")) return "anulado";
  return "aprobado";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayName(name?: string): string {
  return name?.trim() ?? "";
}

function moduloLabel(href?: string): string {
  if (href?.includes("anticipo")) return "Mis Anticipos";
  return "Mi Tiempo";
}

function ctaLabel(href?: string): string {
  if (href?.includes("anticipo")) return "Abrir Mis Anticipos";
  return "Abrir Mi Tiempo";
}

function loteChipLabel(count: number, href?: string): string {
  if (href?.includes("anticipo")) {
    return count === 1 ? "1 anticipo" : `${count} anticipos`;
  }
  return count === 1 ? "1 día" : `${count} días`;
}

function splitMotivo(text: string): { cuerpo: string; motivo?: string } {
  const match = text.match(/^([\s\S]*?)\s*·\s*Motivo:\s*([\s\S]+)$/);
  if (!match) return { cuerpo: text };
  return { cuerpo: match[1].trim(), motivo: match[2].trim() };
}

function countFromText(text: string): number | undefined {
  const match = text.match(/(\d+)\s+(días|registros|anticipos)\b/i);
  if (!match) return undefined;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 1 ? n : undefined;
}

export function buildMailHtml(input: {
  subject: string;
  text: string;
  href?: string;
  toName?: string;
  registrosCount?: number;
}): string {
  const url = escapeHtml(absolutePortalHref(input.href));
  const tone = TONE[mailToneFromSubject(input.subject)];
  const { cuerpo, motivo } = splitMotivo(input.text);
  const nombre = displayName(input.toName);
  const modulo = escapeHtml(moduloLabel(input.href));
  const btn = escapeHtml(ctaLabel(input.href));
  const lote =
    (input.registrosCount && input.registrosCount > 1
      ? input.registrosCount
      : countFromText(input.text)) ?? 0;

  const saludo = nombre
    ? `<p style="margin:0 0 14px;font-size:13px;line-height:1.4;color:${TEXT};">Hola ${escapeHtml(nombre)},</p>`
    : "";

  const loteChip =
    lote > 1
      ? `<td width="6" style="font-size:0;line-height:0;">&nbsp;</td>
        <td style="background:#eef3f9;color:${NAVY};border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;line-height:16px;white-space:nowrap;">${escapeHtml(loteChipLabel(lote, input.href))}</td>`
      : "";

  const motivoBox = motivo
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 0;">
        <tr>
          <td style="background:#fff7ed;border-left:4px solid #c2410c;border-radius:0 8px 8px 0;padding:12px 14px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#9a3412;">Motivo</p>
            <p style="margin:0;font-size:14px;font-weight:600;line-height:1.45;color:${TEXT};">${escapeHtml(motivo)}</p>
          </td>
        </tr>
      </table>`
    : "";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(input.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BG};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
      <tr>
        <td align="center" style="padding:28px 16px;">
          <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:10px;">
            <tr>
              <td style="padding:24px 24px 20px;font-family:Arial,Helvetica,sans-serif;">
                <img src="${HMV_LOGO_SRC}" alt="HMV Ingenieros" height="28" style="display:block;height:28px;width:auto;border:0;outline:none;" />
                <p style="margin:18px 0 12px;font-size:11px;color:${MUTED};">${modulo}</p>
                ${saludo}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
                  <tr>
                    <td style="background:${tone.bg};color:${tone.fg};border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;line-height:16px;white-space:nowrap;">${tone.label}</td>
                    ${loteChip}
                  </tr>
                </table>
                <p style="margin:0;font-size:13px;line-height:1.5;color:${COPY};">${escapeHtml(cuerpo)}</p>
                ${motivoBox}
                <p style="margin:18px 0 0;">
                  <a href="${url}" style="font-size:12px;font-weight:600;color:${NAVY};text-decoration:underline;">${btn}</a>
                </p>
                <p style="margin:16px 0 0;font-size:11px;line-height:1.4;color:${MUTED};">Aviso automático. No respondas este correo.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Los avisos reales que manda el portal (para previsualizar layout). */
export const MAIL_PREVIEW_SCENARIOS: Array<{
  id: string;
  toName: string;
  subject: string;
  text: string;
  href: string;
  registrosCount?: number;
}> = [
  {
    id: "tiempo-aprobado",
    toName: "Liz Lino",
    subject: "Horas aprobadas",
    text: "Tus 8 h del 15/09/2026 en TIC1000 quedaron aprobadas.",
    href: "/hoja-tiempo",
    registrosCount: 1,
  },
  {
    id: "tiempo-aprobado-lote",
    toName: "Liz Lino",
    subject: "Horas aprobadas",
    text: "Tus 24 h del 15/09/2026 en TIC1000 quedaron aprobadas.",
    href: "/hoja-tiempo",
    registrosCount: 3,
  },
  {
    id: "tiempo-rechazado",
    toName: "Liz Lino",
    subject: "Horas rechazadas",
    text: "Tus 8 h del 15/09/2026 en TIC1000 fueron rechazadas. · Motivo: falta soporte de campo",
    href: "/hoja-tiempo",
    registrosCount: 1,
  },
  {
    id: "tiempo-anulado",
    toName: "Liz Lino",
    subject: "Aprobación anulada",
    text: "El gerente devolvió tus 8 h del 15/09/2026 en TIC1000. Ya las puedes editar en Mi Tiempo.",
    href: "/hoja-tiempo",
    registrosCount: 1,
  },
  {
    id: "anticipo-aprobado",
    toName: "Liz Lino",
    subject: "Anticipo aprobado",
    text: "Se aprobó tu anticipo en TIC1000.",
    href: "/mis-anticipos",
    registrosCount: 1,
  },
  {
    id: "anticipo-aprobado-lote",
    toName: "Liz Lino",
    subject: "Anticipo aprobado",
    text: "Se aprobaron 3 anticipos.",
    href: "/mis-anticipos",
    registrosCount: 3,
  },
  {
    id: "anticipo-rechazado",
    toName: "Liz Lino",
    subject: "Anticipo rechazado",
    text: "Se rechazó tu anticipo en TIC1000. · Motivo: el destino no coincide con el viaje",
    href: "/mis-anticipos",
    registrosCount: 1,
  },
];
