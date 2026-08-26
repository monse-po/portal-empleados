import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Modo enfoque: vacío o FOCUS=tiempo → solo registro/aprobación de tiempo.
    // FOCUS=all npm run dev restaura la app completa.
    NEXT_PUBLIC_FOCUS: process.env.FOCUS ?? "",
    NEXT_PUBLIC_IFS_AUTH_ENABLED: process.env.IFS_AUTH_ENABLED ?? "",
  },
};

export default nextConfig;
