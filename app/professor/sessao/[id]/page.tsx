import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPapel } from "../../../../lib/sessaoServidor";
import { conversaDaSessao } from "../../../../src/bd/professor";
import { LayoutApp } from "../../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../../componentes/ui/CabecalhoPagina";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaSessao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await exigirPapel(["professor"]);

  const conversa = await conversaDaSessao(sessao.usuarioId, id);
  if (!conversa) notFound();

  return (
    <LayoutApp sessao={sessao}>
      <Link href="/professor" className="text-sm text-roxo hover:underline">&larr; Voltar ao painel</Link>
      <div className="mt-2">
        <CabecalhoPagina titulo={`Conversa de ${conversa.aluno}`} />
      </div>
      <div className="mt-6 space-y-3">
        {conversa.mensagens.map((m, i) => (
          <div key={i} className={m.autor === "aluno" ? "text-right" : "text-left"}>
            <span className={`inline-block max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 ${
              m.autor === "aluno" ? "bg-roxo text-white" : "border border-borda bg-tela text-grafite"}`}>
              {m.anexoImagem && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.anexoImagem} alt="Imagem enviada pelo aluno" className="mb-2 max-h-40 rounded-lg" />
              )}
              {m.conteudo}
            </span>
            <p className="mt-1 text-xs text-slate-400">{m.autor === "aluno" ? "Aluno" : "Tutor"} · {m.quando}</p>
          </div>
        ))}
      </div>
    </LayoutApp>
  );
}
