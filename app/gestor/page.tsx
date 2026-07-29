import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../lib/sessao";
import { kpisGestor, perguntasPorDia, alunosMaisAtivos } from "../../src/bd/gestor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function Kpi({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div className={`rounded-xl p-5 text-white shadow-sm ${cor}`}>
      <p className="text-sm opacity-90">{rotulo}</p>
      <p className="mt-1 text-3xl font-bold">{valor}</p>
    </div>
  );
}

export default async function PaginaGestor() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "gestor") redirect("/login");

  const [kpis, porDia, ativos] = await Promise.all([
    kpisGestor(sessao.escolaId),
    perguntasPorDia(sessao.escolaId),
    alunosMaisAtivos(sessao.escolaId),
  ]);

  const maxDia = Math.max(1, ...porDia.map((p) => p.total));
  const maxAtivo = Math.max(1, ...ativos.map((a) => a.perguntas));

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel Gestor</h1>
          <p className="text-sm text-slate-500">Visão geral da escola</p>
        </div>
        <div className="flex items-center gap-4">
          <a href="/gestor/gestao" className="text-sm text-[#3B2C63] hover:underline">Gestão / Cadastros</a>
          <form action="/auth/sair" method="post">
            <button type="submit" className="text-sm text-slate-500 hover:text-slate-800">Sair</button>
          </form>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5" aria-label="Indicadores">
        <Kpi rotulo="Alunos" valor={kpis.alunos} cor="bg-blue-600" />
        <Kpi rotulo="Professores" valor={kpis.professores} cor="bg-indigo-600" />
        <Kpi rotulo="Sessões" valor={kpis.sessoes} cor="bg-teal-600" />
        <Kpi rotulo="Perguntas" valor={kpis.perguntas} cor="bg-emerald-600" />
        <Kpi rotulo="Alertas" valor={kpis.alertas} cor={kpis.alertas > 0 ? "bg-red-600" : "bg-slate-500"} />
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Perguntas por dia</h2>
        {porDia.length === 0 ? (
          <p className="mt-2 text-slate-500">Ainda não há dados.</p>
        ) : (
          <div className="mt-4 flex h-40 items-end gap-2">
            {porDia.map((p, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-end" style={{ height: "120px" }}>
                  <div className="w-full rounded-t bg-blue-500"
                    style={{ height: `${(p.total / maxDia) * 100}%` }}
                    title={`${p.total} pergunta(s)`} />
                </div>
                <span className="text-[10px] text-slate-400">{p.dia}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Alunos mais ativos</h2>
        {ativos.length === 0 ? (
          <p className="mt-2 text-slate-500">Ainda não há dados.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {ativos.map((a, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-sm text-slate-700">{a.aluno}</span>
                <div className="h-4 flex-1 rounded bg-slate-100">
                  <div className="h-4 rounded bg-emerald-500" style={{ width: `${(a.perguntas / maxAtivo) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-sm text-slate-500">{a.perguntas}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
