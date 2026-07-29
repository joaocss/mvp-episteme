import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../lib/sessao";
import {
  estatisticasProfessor, listarSessoes, alertas, registrarAcessoProfessor,
} from "../../src/bd/professor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function Cartao({ rotulo, valor, destaque = false }: { rotulo: string; valor: number; destaque?: boolean }) {
  const alerta = destaque && valor > 0;
  return (
    <div className={`rounded-lg border p-4 ${alerta ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
      <p className="text-sm text-slate-500">{rotulo}</p>
      <p className={`text-2xl font-bold ${alerta ? "text-red-700" : "text-slate-900"}`}>{valor}</p>
    </div>
  );
}

export default async function PaginaProfessor() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") redirect("/login");

  await registrarAcessoProfessor(sessao.escolaId, sessao.usuarioId);
  const [est, sessoes, listaAlertas] = await Promise.all([
    estatisticasProfessor(sessao.usuarioId),
    listarSessoes(sessao.usuarioId),
    alertas(sessao.usuarioId),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Painel do Professor — 6º ano</h1>
        <div className="flex items-center gap-4">
          <a href="/api/professor/export" className="text-sm text-blue-700 hover:underline">Exportar CSV</a>
          <form action="/auth/sair" method="post">
            <button type="submit" className="text-sm text-slate-500 hover:text-slate-800">Sair</button>
          </form>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4" aria-label="Indicadores">
        <Cartao rotulo="Alunos" valor={est.totalAlunos} />
        <Cartao rotulo="Sessões" valor={est.totalSessoes} />
        <Cartao rotulo="Perguntas" valor={est.totalPerguntas} />
        <Cartao rotulo="Alertas de segurança" valor={est.alertasSeguranca} destaque />
      </section>

      {listaAlertas.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Alertas</h2>
          <ul className="mt-3 space-y-2">
            {listaAlertas.map((a, i) => (
              <li key={i} className={`rounded-md border p-3 ${a.severidade === "alta" ? "border-red-300 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                <p className="text-sm font-medium text-slate-800">{a.categoria} · {a.severidade}</p>
                <p className="text-sm text-slate-600">{a.detalhe}</p>
                <p className="mt-1 text-xs text-slate-400">{a.aluno} · {a.quando}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Sessões</h2>
        {sessoes.length === 0 ? (
          <p className="mt-2 text-slate-500">Ainda não há sessões.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sessoes.map((s) => (
              <li key={s.sessaoId} className="rounded-md border border-slate-200 bg-white p-3">
                <Link href={`/professor/sessao/${s.sessaoId}`} className="flex items-center justify-between hover:underline">
                  <span className="text-slate-900">{s.aluno} — {s.perguntas} pergunta(s)</span>
                  <span className="text-xs text-slate-400">{s.iniciada}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
