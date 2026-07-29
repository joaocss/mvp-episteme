import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../../../lib/sessao";
import { turmasDoProfessor } from "../../../../src/bd/provas";
import ElaborarProva from "./ElaborarProva";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaNovaProva() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") redirect("/login");

  const turmas = await turmasDoProfessor(sessao.escolaId, sessao.usuarioId);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/professor/provas" className="text-sm text-roxo hover:underline">← Voltar às provas</Link>
      <h1 className="mt-2 text-2xl font-bold">Elaborar Prova</h1>
      <p className="mt-1 text-slate-600">
        A IA gera um rascunho de questões com base no material da escola. Você revisa e edita cada questão antes de publicar.
      </p>

      <div className="mt-6">
        {turmas.length === 0 ? (
          <p className="text-alerta">Você ainda não leciona nenhuma turma.</p>
        ) : (
          <ElaborarProva turmas={turmas} />
        )}
      </div>
    </main>
  );
}
