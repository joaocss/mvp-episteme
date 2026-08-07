"use client";

// Documento do plano de ensino: renderiza o markdown com tipografia de documento
// (nao mais texto cru), com cabecalho da escola (logo opcional) e botao de
// imprimir/salvar PDF. Estilo "papel" limpo, pensado para impressao.
import ReactMarkdown from "react-markdown";
import { Botao } from "../../../componentes/ui/Botao";
import { Icone } from "../../../componentes/ui/Icone";

export default function DocumentoPlano({
  markdown, nomeEscola, logoUrl,
}: { markdown: string; nomeEscola: string; logoUrl: string | null }) {
  return (
    <div>
      <div className="no-imprimir mb-3 flex justify-end">
        <Botao tamanho="pequeno" variante="secundario" onClick={() => window.print()}>
          <Icone nome="pdf" className="h-4 w-4" /> Imprimir / Salvar PDF
        </Botao>
      </div>

      <style>{`
        @page { margin: 18mm 16mm; }
        @media print {
          .no-imprimir { display: none !important; }
          .folha-plano { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: none !important; }
        }
      `}</style>

      <article className="folha-plano mx-auto max-w-[820px] rounded-xl border border-borda bg-white p-8 shadow-cartao sm:p-10">
        <header className="flex items-center gap-3 border-b-2 border-grafite pb-4">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-12 w-12 object-contain" />
          )}
          <div>
            <p className="text-lg font-bold text-grafite">{nomeEscola || "Escola"}</p>
            <p className="text-sm text-slate-500">Plano de ensino</p>
          </div>
        </header>
        <div className="prose-tutor mt-6 max-w-none">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
