import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { lerToken } from "../../../../../lib/sessao";
import { obterProvaComQuestoes, respostasParaCorrecao } from "../../../../../src/bd/provas";
import { obterConfigEscola } from "../../../../../src/bd/configEscola";
import CorrecaoManual from "./CorrecaoManual";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaCorrecao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") redirect("/login");

  const prova = await obterProvaComQuestoes(sessao.escolaId, sessao.usuarioId, id);
  if (!prova) notFound();
  const [itens, config] = await Promise.all([
    respostasParaCorrecao(sessao.escolaId, sessao.usuarioId, id),
    obterConfigEscola(sessao.escolaId),
  ]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href={`/professor/provas/${id}`} className="text-sm text-roxo hover:underline">← Voltar à prova</Link>
      <h1 className="mt-2 text-2xl font-bold">Corrigir — {prova.titulo}</h1>
      <p className="mt-1 text-slate-600">{prova.turma} — {prova.assunto}</p>
      <p className="mt-1 text-sm text-slate-500">
        A correção automática/IA fica registrada; sua nota manual, quando preenchida, passa a valer para o aluno.
      </p>

      <div className="mt-6">
        <CorrecaoManual itens={itens} notaMaxima={config.notaMaxima} />
      </div>
    </main>
  );
}
