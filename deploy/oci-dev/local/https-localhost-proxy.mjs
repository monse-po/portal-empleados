#!/usr/bin/env node
/**
 * HTTPS en https://localhost:3001 → HTTP http://127.0.0.1:13001 (túnel SSH a la VM).
 * Soluciona ERR_SSL_PROTOCOL_ERROR cuando IFS redirige a https://localhost:3001.
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
  const proxy = httpRequest(
    {
      hostname: "127.0.0.1",
      port: UPSTREAM,
      path: req.url,
      method: req.method,
      headers,
    },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
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
});
