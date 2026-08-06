import "./globals.css";
import type { Metadata, Viewport } from "next";
import RegistrarPWA from "./componentes/RegistrarPWA";

export const metadata: Metadata = {
  title: "Episteme — Inteligência que ensina a pensar",
  description: "Plataforma educacional com tutor de IA ancorado no material da escola (RAG).",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Episteme", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#3B2C63",
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
        <RegistrarPWA />
      </body>
    </html>
  );
}
