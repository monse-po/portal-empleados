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
  title: "Hoja de Tiempo",
  description: "Portal empresarial de hoja de tiempo",
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
