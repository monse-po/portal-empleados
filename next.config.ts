import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Modo enfoque: vacío o FOCUS=all → app completa.
    // FOCUS=tiempo npm run dev aísla un módulo.
    NEXT_PUBLIC_FOCUS: process.env.FOCUS ?? "",
    NEXT_PUBLIC_IFS_AUTH_ENABLED: process.env.IFS_AUTH_ENABLED ?? "",
  },
};

export default nextConfig;
