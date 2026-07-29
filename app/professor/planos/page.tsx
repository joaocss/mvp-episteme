import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../../lib/sessao";
import { listarPlanosEnsino } from "../../../src/rag/planejamento";
import GeradorPlano from "./GeradorPlano";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaPlanos() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") redirect("/login");

  const planos = await listarPlanosEnsino(sessao.usuarioId);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/professor" className="text-sm text-[#3B2C63] hover:underline">← Voltar ao painel</Link>
      <h1 className="mt-2 text-2xl font-bold">Planejamento — Plano de Ensino</h1>
      <p className="mt-1 text-slate-600">
        Gera um plano de ensino de Matemática do 6º ano com base no livro didático, na BNCC e no perfil da turma (incluindo alunos atípicos).
      </p>

      <div className="mt-6"><GeradorPlano /></div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Planos salvos</h2>
        {planos.length === 0 ? (
          <p className="mt-2 text-slate-500">Nenhum plano gerado ainda.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {planos.map((p) => (
              <li key={p.id} className="rounded-md border border-slate-200 bg-white p-3">
                <Link href={`/professor/planos/${p.id}`} className="flex items-center justify-between hover:underline">
                  <span>{p.disciplina} — {p.turma} ({p.anoLetivo})</span>
                  <span className="text-xs text-slate-400">{p.criadoEm}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
