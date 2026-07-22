import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Modo enfoque: `FOCUS=tiempo npm run dev` limita la app a un módulo.
    // Se expone como NEXT_PUBLIC_* para que lo lean componentes de cliente.
    NEXT_PUBLIC_FOCUS: process.env.FOCUS ?? "",
  },
};

export default nextConfig;
