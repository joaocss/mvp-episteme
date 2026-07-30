import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../../lib/sessao";
import { alunosPorTurmaEscola, desempenhoProvasEscola } from "../../../src/bd/gestor";
import { obterConfigEscola } from "../../../src/bd/configEscola";
import { Marca } from "../../componentes/Marca";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaDesempenhoGestor() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) redirect("/login");

  const [turmas, desempenho, config] = await Promise.all([
    alunosPorTurmaEscola(sessao.escolaId),
    desempenhoProvasEscola(sessao.escolaId),
    obterConfigEscola(sessao.escolaId),
  ]);

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-5xl p-6">
        <Marca compacto />
        <Link href="/gestor" className="mt-4 inline-block text-sm text-roxo hover:underline">← Voltar ao painel</Link>
        <h1 className="mt-2 text-2xl font-bold text-grafite">Desempenho — toda a escola</h1>

        <section className="mt-6">
          <h2 className="font-semibold text-grafite">Notas e acertos por prova</h2>
          {desempenho.length === 0 ? (
            <p className="mt-2 text-slate-500">Nenhuma prova publicada com respostas ainda.</p>
          ) : (
            <div className="mt-3 overflow-x-auto cartao">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="p-3">Turma</th><th className="p-3">Prova</th><th className="p-3">Aluno</th>
                    <th className="p-3">Acertos (objetivas)</th><th className="p-3">Nota média</th>
                  </tr>
                </thead>
                <tbody>
                  {desempenho.map((d, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="p-3">{d.turma}</td>
                      <td className="p-3">{d.tituloProva}</td>
                      <td className="p-3">{d.aluno}</td>
                      <td className="p-3">{d.acertosObjetivas}/{d.totalObjetivas}</td>
                      <td className="p-3 font-medium text-grafite">{d.notaMedia}/{config.notaMaxima}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-semibold text-grafite">Alunos por turma</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {turmas.map((t) => (
              <div key={t.turmaId} className="cartao p-4">
                <h3 className="font-semibold text-grafite">{t.turma} <span className="font-normal text-slate-400">({t.alunos.length})</span></h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {t.alunos.map((a) => <li key={a.id}>{a.nome}</li>)}
                  {t.alunos.length === 0 && <li className="text-slate-400">sem alunos matriculados</li>}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
