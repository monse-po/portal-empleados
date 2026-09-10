import type { NextConfig } from "next";

const ifsAuthReady =
  process.env.IFS_AUTH_ENABLED === "true" &&
  Boolean(
    (
      process.env.IFS_OAUTH_CLIENT_ID ||
      process.env.IFS_IDCS_CLIENT_ID ||
      ""
    ).trim() &&
      (
        process.env.IFS_OAUTH_CLIENT_SECRET ||
        process.env.IFS_IDCS_CLIENT_SECRET ||
        ""
      ).trim() &&
      (process.env.IFS_OAUTH_REDIRECT_URI || "").trim(),
  );

const nextConfig: NextConfig = {
  env: {
    // Modo enfoque: vacío o FOCUS=all → app completa.
    // FOCUS=tiempo,anticipos recorta el menú a esos módulos.
    NEXT_PUBLIC_FOCUS: process.env.FOCUS ?? "",
    // Muro de /login solo si el client IFS está completo. Si no, el portal se ve.
    NEXT_PUBLIC_IFS_AUTH_ENABLED: ifsAuthReady ? "true" : "",
  },
};

export default nextConfig;
