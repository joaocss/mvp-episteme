import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPapel } from "../../../../../lib/sessaoServidor";
import { obterProvaComQuestoes, respostasParaCorrecao } from "../../../../../src/bd/provas";
import { obterConfigEscola } from "../../../../../src/bd/configEscola";
import { LayoutApp } from "../../../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../../../componentes/ui/CabecalhoPagina";
import CorrecaoManual from "./CorrecaoManual";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaCorrecao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await exigirPapel(["professor"]);

  const prova = await obterProvaComQuestoes(sessao.escolaId, sessao.usuarioId, id);
  if (!prova) notFound();
  const [itens, config] = await Promise.all([
    respostasParaCorrecao(sessao.escolaId, sessao.usuarioId, id),
    obterConfigEscola(sessao.escolaId),
  ]);

  return (
    <LayoutApp sessao={sessao}>
      <Link href={`/professor/provas/${id}`} className="text-sm text-roxo hover:underline">&larr; Voltar a prova</Link>
      <div className="mt-2">
        <CabecalhoPagina
          titulo={`Corrigir — ${prova.titulo}`}
          subtitulo={`${prova.turma} — ${prova.assunto}. A correcao automatica/IA fica registrada; sua nota manual, quando preenchida, passa a valer para o aluno.`}
        />
      </div>

      <div className="mt-6">
        <CorrecaoManual itens={itens} notaMaxima={config.notaMaxima} />
      </div>
    </LayoutApp>
  );
}
