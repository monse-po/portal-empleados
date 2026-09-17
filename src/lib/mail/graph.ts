import { getEntraConfig } from "@/src/lib/ifs/entra";
import { getMailFrom } from "@/src/lib/mail/config";

type GraphToken = { accessToken: string; expiresAt: number };

let cachedToken: GraphToken | null = null;

function graphEntraConfig() {
  const login = getEntraConfig();
  const clientId =
    process.env.MAIL_ENTRA_CLIENT_ID?.trim() || login.clientId;
  const tenant =
    process.env.MAIL_ENTRA_TENANT?.trim() ||
    (login.tenant !== "common" ? login.tenant : "") ||
    "";
  const secret =
    process.env.MAIL_ENTRA_CLIENT_SECRET?.trim() || login.secret;
  return { clientId, tenant, secret };
}

export function isGraphMailConfigured(): boolean {
  const { clientId, tenant, secret } = graphEntraConfig();
  return Boolean(clientId && tenant && secret && getMailFrom());
}

async function fetchGraphAppToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.accessToken;
  }

  const { clientId, tenant, secret } = graphEntraConfig();
  if (!clientId || !tenant || !secret) {
    throw new Error(
      "Falta MAIL_ENTRA_CLIENT_ID / TENANT / SECRET (o IFS_ENTRA_*) para enviar por Microsoft",
    );
  }
  if (tenant === "common" || tenant === "organizations") {
    throw new Error(
      "MAIL_ENTRA_TENANT debe ser el id del tenant HMV, no common",
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: secret,
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Graph token ${res.status}: ${text.slice(0, 240)}`);
  }

  const json = JSON.parse(text) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) {
    throw new Error("Graph OAuth: respuesta sin access_token");
  }

  cachedToken = {
    accessToken: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

export async function sendMailViaGraph(input: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const from = getMailFrom();
  if (!from) {
    throw new Error("Falta MAIL_FROM (buzón noreply de HMV)");
  }

  const token = await fetchGraphAppToken();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: input.subject,
          body: { contentType: "HTML", content: input.html },
          toRecipients: [
            {
              emailAddress: {
                address: input.to,
                name: input.toName || undefined,
              },
            },
          ],
        },
        saveToSentItems: false,
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph sendMail ${res.status}: ${text.slice(0, 300)}`);
  }
}
