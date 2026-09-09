import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Modo enfoque: vacío o FOCUS=all → app completa.
    // FOCUS=tiempo,anticipos recorta el menú a esos módulos.
    NEXT_PUBLIC_FOCUS: process.env.FOCUS ?? "",
    NEXT_PUBLIC_IFS_AUTH_ENABLED: process.env.IFS_AUTH_ENABLED ?? "",
    // Local y DEV QA: sin muro de /login ni clave. PROD sí pide sesión.
    NEXT_PUBLIC_PORTAL_LOGIN_REQUIRED:
      process.env.NODE_ENV === "production" &&
      process.env.IFS_AUTH_ENABLED === "true" &&
      !(process.env.IFS_OAUTH_REDIRECT_URI ?? "").includes(
        "hmv-empleados-dev",
      )
        ? "true"
        : "",
  },
};

export default nextConfig;
