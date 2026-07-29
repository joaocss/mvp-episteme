import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { lerToken } from "../../../../lib/sessao";
import { obterProvaComQuestoes } from "../../../../src/bd/provas";
import EditorQuestoes from "./EditorQuestoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaProva({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") redirect("/login");

  const prova = await obterProvaComQuestoes(sessao.escolaId, sessao.usuarioId, id);
  if (!prova) notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/professor/provas" className="text-sm text-roxo hover:underline">← Voltar às provas</Link>
      <h1 className="mt-2 text-2xl font-bold">{prova.titulo}</h1>
      <p className="mt-1 text-slate-600">{prova.turma} — {prova.assunto}</p>

      <div className="mt-6">
        <EditorQuestoes prova={prova} />
      </div>
    </main>
  );
}
