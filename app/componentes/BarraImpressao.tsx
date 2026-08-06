"use client";

// Barra de acoes da folha de impressao de prova (some na impressao via CSS).
// Botao "Imprimir / Salvar PDF" chama o dialogo do navegador (Salvar como PDF);
// alternador com/sem gabarito troca a querystring.
import Link from "next/link";
import { Botao } from "./ui/Botao";
import { Icone } from "./ui/Icone";

export default function BarraImpressao({ provaId, comGabarito }: { provaId: string; comGabarito: boolean }) {
  const base = `/professor/provas/${provaId}/imprimir`;
  return (
    <div className="barra-impressao sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-borda bg-superficie/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <Link href={`/professor/provas/${provaId}`} className="text-sm text-roxo hover:underline">← Voltar à prova</Link>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-borda text-sm">
          <Link href={base} className={`px-3 py-1.5 ${!comGabarito ? "bg-roxo text-white" : "text-slate-600 hover:bg-creme"}`}>
            Prova (aluno)
          </Link>
          <Link href={`${base}?gabarito=1`} className={`px-3 py-1.5 ${comGabarito ? "bg-roxo text-white" : "text-slate-600 hover:bg-creme"}`}>
            Com gabarito
          </Link>
        </div>
        <Botao tamanho="pequeno" onClick={() => window.print()}>
          <Icone nome="pdf" className="h-4 w-4" /> Imprimir / Salvar PDF
        </Botao>
      </div>
    </div>
  );
}
