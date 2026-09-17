import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Modo enfoque: vacío o FOCUS=all → app completa.
    // FOCUS=tiempo,anticipos recorta el menú a esos módulos.
    NEXT_PUBLIC_FOCUS: process.env.FOCUS ?? "",
    NEXT_PUBLIC_IFS_AUTH_ENABLED: process.env.IFS_AUTH_ENABLED ?? "",
    // Mismo criterio que isPortalLoginRequired(): sin sesión IFS, /login.
    NEXT_PUBLIC_PORTAL_LOGIN_REQUIRED:
      process.env.IFS_AUTH_ENABLED === "true" ? "true" : "",
  },
};

export default nextConfig;
