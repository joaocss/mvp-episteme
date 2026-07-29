import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Episteme — Tutor de Matemática (6º ano)",
  description: "Tutor de IA ancorado no livro didático e na BNCC.",
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
