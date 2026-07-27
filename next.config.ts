import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Modo enfoque: `FOCUS=tiempo npm run dev` limita la app a un módulo.
    // Se expone como NEXT_PUBLIC_* para que lo lean componentes de cliente.
    NEXT_PUBLIC_FOCUS: process.env.FOCUS ?? "",
    NEXT_PUBLIC_IFS_AUTH_ENABLED: process.env.IFS_AUTH_ENABLED ?? "",
  },
};

export default nextConfig;
