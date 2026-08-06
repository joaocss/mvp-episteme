import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPapel } from "../../../../lib/sessaoServidor";
import { obterProvaComQuestoes } from "../../../../src/bd/provas";
import { LayoutApp } from "../../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../../componentes/ui/CabecalhoPagina";
import { variantesBotao } from "../../../componentes/ui/Botao";
import EditorQuestoes from "./EditorQuestoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaProva({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await exigirPapel(["professor"]);

  const prova = await obterProvaComQuestoes(sessao.escolaId, sessao.usuarioId, id);
  if (!prova) notFound();

  return (
    <LayoutApp sessao={sessao}>
      <Link href="/professor/provas" className="text-sm text-roxo hover:underline">&larr; Voltar as provas</Link>
      <div className="mt-2">
        <CabecalhoPagina
          titulo={prova.titulo}
          subtitulo={`${prova.turma} — ${prova.assunto}`}
          acoes={
            <>
              <Link href={`/professor/provas/${id}/imprimir`} className={variantesBotao({ variante: "secundario", tamanho: "pequeno" })}>
                Imprimir prova
              </Link>
              {prova.status !== "rascunho" && (
                <Link href={`/professor/provas/${id}/corrigir`} className={variantesBotao({ variante: "secundario", tamanho: "pequeno" })}>
                  Corrigir respostas
                </Link>
              )}
            </>
          }
        />
      </div>

      <div className="mt-6">
        <EditorQuestoes prova={prova} />
      </div>
    </LayoutApp>
  );
}
