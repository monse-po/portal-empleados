#!/usr/bin/env node
/**
 * HTTPS en https://localhost:3001 → HTTP http://127.0.0.1:13001 (túnel SSH a la VM).
 * Soluciona ERR_SSL_PROTOCOL_ERROR cuando IFS redirige a https://localhost:3001.
 * Además quita cookies enormes (hmv_ifs_session) que provocan 400 Cookie Too Large.
 */
import { createServer } from "node:https";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { request as httpRequest } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const certDir = join(__dirname, "certs");
const keyPath = join(certDir, "localhost-key.pem");
const certPath = join(certDir, "localhost.pem");
const LISTEN = 3001;
const UPSTREAM = 13001;
const MAX_COOKIE_HEADER = 3500;
const DROP_NAMES = new Set(["hmv_ifs_session"]); // JWT legacy enorme

function slimCookieHeader(raw) {
  if (!raw) return undefined;
  const kept = [];
  for (const part of String(raw).split(";")) {
    const piece = part.trim();
    if (!piece) continue;
    const name = piece.split("=", 1)[0]?.trim();
    if (!name || DROP_NAMES.has(name)) continue;
    // Descarta pedazos individuales enormes
    if (piece.length > 1200) continue;
    kept.push(piece);
  }
  let out = kept.join("; ");
  // Si aún es enorme, no mandes Cookie (mejor login limpio que 400)
  if (out.length > MAX_COOKIE_HEADER) {
    console.warn(`[proxy] Cookie ${out.length}B → omitida (demasiado grande)`);
    return undefined;
  }
  if (out.length && out.length !== String(raw).length) {
    console.warn(
      `[proxy] Cookie slim ${String(raw).length}B → ${out.length}B (quitada hmv_ifs_session u otras)`,
    );
  }
  return out || undefined;
}

function expireLegacySetCookies() {
  return [
    "hmv_ifs_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
  ];
}

if (!existsSync(keyPath) || !existsSync(certPath)) {
  mkdirSync(certDir, { recursive: true });
  execSync(
    `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 825 -subj "/CN=localhost"`,
    { stdio: "inherit" },
  );
}

const key = readFileSync(keyPath);
const cert = readFileSync(certPath);

createServer({ key, cert }, (req, res) => {
  const headers = {
    ...req.headers,
    host: `127.0.0.1:${UPSTREAM}`,
    "x-forwarded-host": "localhost:3001",
    "x-forwarded-proto": "https",
    "x-forwarded-port": "3001",
  };
  const slim = slimCookieHeader(req.headers.cookie);
  if (slim) headers.cookie = slim;
  else delete headers.cookie;

  const proxy = httpRequest(
    {
      hostname: "127.0.0.1",
      port: UPSTREAM,
      path: req.url,
      method: req.method,
      headers,
    },
    (up) => {
      const outHeaders = { ...up.headers };
      const setCookie = outHeaders["set-cookie"];
      const extra = expireLegacySetCookies();
      if (Array.isArray(setCookie)) {
        outHeaders["set-cookie"] = [...setCookie, ...extra];
      } else if (typeof setCookie === "string") {
        outHeaders["set-cookie"] = [setCookie, ...extra];
      } else {
        outHeaders["set-cookie"] = extra;
      }
      res.writeHead(up.statusCode || 502, outHeaders);
      up.pipe(res);
    },
  );
  proxy.on("error", (err) => {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(
      `Proxy HTTPS → túnel caído (${err.message}).\n` +
        `1) Corre: ./deploy-via-bastion.sh tunnel-http\n` +
        `2) Deja esa ventana abierta.\n`,
    );
  });
  req.pipe(proxy);
}).listen(LISTEN, "127.0.0.1", () => {
  console.log(`HTTPS listo → https://localhost:${LISTEN}  (upstream :${UPSTREAM})`);
  console.log("Acepta el aviso de certificado autofirmado en el navegador.");
  console.log("Las cookies enormes (hmv_ifs_session) se filtran automáticamente.");
});
