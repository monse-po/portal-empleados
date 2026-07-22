import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PortalShell } from "@/src/components/layout/PortalShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Portal de Empleados",
  description: "Portal empresarial HMV — hoja de tiempo, anticipos y más",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body>
        <PortalShell>{children}</PortalShell>
      </body>
    </html>
  );
}
