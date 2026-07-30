import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../../lib/sessao";
import { alunosPorTurmaProfessor, desempenhoProvasProfessor } from "../../../src/bd/professor";
import { obterConfigEscola } from "../../../src/bd/configEscola";
import DesempenhoTurma from "./DesempenhoTurma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaDesempenhoProfessor() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") redirect("/login");

  const [turmas, desempenho, config] = await Promise.all([
    alunosPorTurmaProfessor(sessao.usuarioId),
    desempenhoProvasProfessor(sessao.escolaId, sessao.usuarioId),
    obterConfigEscola(sessao.escolaId),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link href="/professor" className="text-sm text-roxo hover:underline">← Voltar ao painel</Link>
      <h1 className="mt-2 text-2xl font-bold">Desempenho e notas</h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-slate-800">Notas e acertos por prova</h2>
        {desempenho.length === 0 ? (
          <p className="mt-2 text-slate-500">Nenhuma prova publicada com respostas ainda.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
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
                    <td className="p-3 font-medium">{d.notaMedia}/{config.notaMaxima}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-800">Lançar notas e faltas por turma</h2>
        {turmas.length === 0 ? (
          <p className="mt-2 text-slate-500">Você ainda não está vinculado a nenhuma turma.</p>
        ) : (
          <div className="mt-3">
            <DesempenhoTurma turmas={turmas} notaMaxima={config.notaMaxima} />
          </div>
        )}
      </section>
    </main>
  );
}
