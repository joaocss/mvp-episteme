import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../../lib/sessao";
import { listarTurmas, listarProfessores, listarAlunosGeral } from "../../../src/bd/gestao";
import FormulariosGestao from "./FormulariosGestao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaGestao() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "gestor") redirect("/login");

  const [turmas, professores, alunos] = await Promise.all([
    listarTurmas(sessao.escolaId),
    listarProfessores(sessao.escolaId),
    listarAlunosGeral(sessao.escolaId),
  ]);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Link href="/gestor" className="text-sm text-[#3B2C63] hover:underline">← Voltar ao painel</Link>
      <h1 className="mt-2 text-2xl font-bold">Gestão — Cadastros</h1>

      <section className="mt-6">
        <FormulariosGestao
          turmas={turmas.map((t) => ({ id: t.id, nome: t.nome }))}
          professores={professores.map((p) => ({ id: p.id, nome: p.nome }))}
        />
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <section>
          <h2 className="font-semibold">Turmas ({turmas.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {turmas.map((t) => (
              <li key={t.id} className="rounded border border-slate-200 bg-white p-2">
                {t.nome} · {t.serie} · {t.anoLetivo} · {t.alunos} aluno(s)
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-semibold">Professores ({professores.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {professores.map((p) => (
              <li key={p.id} className="rounded border border-slate-200 bg-white p-2">
                {p.nome} · {p.email} · {p.turmas} turma(s)
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-semibold">Alunos ({alunos.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {alunos.map((a) => (
              <li key={a.id} className="rounded border border-slate-200 bg-white p-2">
                {a.nome} · {a.turma ?? "sem turma"}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
