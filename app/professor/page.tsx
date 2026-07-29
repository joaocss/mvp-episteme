import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../lib/sessao";
import {
  estatisticasProfessor, perguntasRecentes, atividadePorAluno, registrarAcessoProfessor,
} from "../../src/bd/professor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function Cartao({ rotulo, valor, destaque = false }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${destaque && valor > 0 ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
      <p className="text-sm text-slate-500">{rotulo}</p>
      <p className={`text-2xl font-bold ${destaque && valor > 0 ? "text-red-700" : "text-slate-900"}`}>{valor}</p>
    </div>
  );
}

export default async function PaginaProfessor() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") redirect("/login");

  await registrarAcessoProfessor(sessao.escolaId, sessao.usuarioId);
  const [est, perguntas, atividade] = await Promise.all([
    estatisticasProfessor(sessao.usuarioId),
    perguntasRecentes(sessao.usuarioId),
    atividadePorAluno(sessao.usuarioId),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Painel do Professor — 6º ano</h1>
        <form action="/auth/sair" method="post">
          <button type="submit" className="text-sm text-slate-500 hover:text-slate-800">Sair</button>
        </form>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4" aria-label="Indicadores">
        <Cartao rotulo="Alunos" valor={est.totalAlunos} />
        <Cartao rotulo="Sessões" valor={est.totalSessoes} />
        <Cartao rotulo="Perguntas" valor={est.totalPerguntas} />
        <Cartao rotulo="Alertas de segurança" valor={est.alertasSeguranca} destaque />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Perguntas recentes</h2>
        {perguntas.length === 0 ? (
          <p className="mt-2 text-slate-500">Ainda não há perguntas.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {perguntas.map((p, i) => (
              <li key={i} className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-slate-900">{p.conteudo}</p>
                <p className="mt-1 text-xs text-slate-400">{p.aluno} · {p.quando}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Atividade por aluno</h2>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-slate-500">
              <th className="py-2">Aluno</th>
              <th className="py-2">Sessões</th>
              <th className="py-2">Perguntas</th>
              <th className="py-2">Última atividade</th>
            </tr>
          </thead>
          <tbody>
            {atividade.map((a, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2">{a.aluno}</td>
                <td className="py-2">{a.sessoes}</td>
                <td className="py-2">{a.perguntas}</td>
                <td className="py-2">{a.ultimaAtividade ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
