import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Episteme — Inteligência que ensina a pensar",
  description: "Plataforma educacional com tutor de IA ancorado no material da escola (RAG).",
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
