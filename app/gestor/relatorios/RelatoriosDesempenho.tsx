"use client";

// Relatorio de desempenho com filtros (turma, disciplina, periodo). Busca no
// servidor a cada "Aplicar"; graficos com Recharts, temados com a marca.
import { useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar,
} from "recharts";

const ROXO = "#3B2C63";
const DOURADO = "#C79A3B";
const inp = "rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6aa5]";
const btn = "rounded-md bg-[#3B2C63] px-3 py-2 text-sm font-medium text-white hover:bg-[#2f2350] disabled:opacity-50";

export interface TurmaOpc { id: string; nome: string }
export interface DiscOpc { slug: string; nome: string }
export interface RelatorioDados {
  geral: { media: number; aprovacao: number; avaliacoes: number; alunos: number };
  porAluno: { alunoId: string; aluno: string; turma: string; disciplina: string; media: number; avaliacoes: number }[];
  porMes: { mes: string; media: number }[];
  distribuicao: { faixa: string; qtd: number }[];
  porDisciplina: { disciplina: string; media: number; avaliacoes: number }[];
}

function Kpi({ rotulo, valor, sufixo = "" }: { rotulo: string; valor: number; sufixo?: string }) {
  return (
    <div className="cartao p-4">
      <p className="text-xs text-slate-500">{rotulo}</p>
      <p className="mt-1 text-2xl font-bold text-grafite">{valor}{sufixo}</p>
    </div>
  );
}

function Quadro({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="cartao p-5">
      <h2 className="text-base font-semibold text-roxo">{titulo}</h2>
      <div className="mt-4 h-56 w-full">{children}</div>
    </section>
  );
}

export default function RelatoriosDesempenho({
  turmas, disciplinas, inicial, rotuloDisciplina,
}: {
  turmas: TurmaOpc[]; disciplinas: DiscOpc[]; inicial: RelatorioDados; rotuloDisciplina: Record<string, string>;
}) {
  const [turmaId, setTurmaId] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dados, setDados] = useState<RelatorioDados>(inicial);
  const [carregando, setCarregando] = useState(false);

  function querystring() {
    const p = new URLSearchParams();
    if (turmaId) p.set("turmaId", turmaId);
    if (disciplina) p.set("disciplina", disciplina);
    if (dataInicio) p.set("dataInicio", dataInicio);
    if (dataFim) p.set("dataFim", dataFim);
    return p.toString();
  }

  async function aplicar() {
    setCarregando(true);
    try {
      const r = await fetch(`/api/gestor/relatorios?${querystring()}`);
      if (r.ok) setDados((await r.json()).relatorio);
    } finally {
      setCarregando(false);
    }
  }

  const disc = (slug: string) => rotuloDisciplina[slug] ?? slug;
  const semNotas = dados.geral.avaliacoes === 0;

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="cartao flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="block text-xs font-medium text-slate-500">Turma</label>
          <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className={`${inp} mt-1`}>
            <option value="">Todas</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Disciplina</label>
          <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)} className={`${inp} mt-1`}>
            <option value="">Todas</option>
            {disciplinas.map((d) => <option key={d.slug} value={d.slug}>{d.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">De</label>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className={`${inp} mt-1`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Até</label>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className={`${inp} mt-1`} />
        </div>
        <button onClick={aplicar} className={btn} disabled={carregando}>{carregando ? "Aplicando…" : "Aplicar filtros"}</button>
        <a href={`/api/gestor/relatorios?formato=csv&${querystring()}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-grafite hover:bg-slate-50">
          Baixar CSV
        </a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi rotulo="Média geral" valor={dados.geral.media} sufixo="%" />
        <Kpi rotulo="Aprovação (≥60%)" valor={dados.geral.aprovacao} sufixo="%" />
        <Kpi rotulo="Avaliações" valor={dados.geral.avaliacoes} />
        <Kpi rotulo="Alunos avaliados" valor={dados.geral.alunos} />
      </div>

      {semNotas ? (
        <div className="cartao p-6 text-center text-slate-500">
          Nenhuma nota lançada para este filtro. Ajuste o período/turma ou lance notas em “Notas e faltas”.
        </div>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Quadro titulo="Média por mês (%)">
              <ResponsiveContainer>
                <AreaChart data={dados.porMes} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-media" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ROXO} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={ROXO} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="media" stroke={ROXO} strokeWidth={2} fill="url(#grad-media)" name="Média %" />
                </AreaChart>
              </ResponsiveContainer>
            </Quadro>

            <Quadro titulo="Distribuição de notas">
              <ResponsiveContainer>
                <BarChart data={dados.distribuicao} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="faixa" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="qtd" fill={DOURADO} radius={[4, 4, 0, 0]} name="Avaliações" />
                </BarChart>
              </ResponsiveContainer>
            </Quadro>

            <Quadro titulo="Média por disciplina (%)">
              <ResponsiveContainer>
                <BarChart data={dados.porDisciplina.map((d) => ({ ...d, nome: disc(d.disciplina) }))} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="media" fill={ROXO} radius={[4, 4, 0, 0]} name="Média %" />
                </BarChart>
              </ResponsiveContainer>
            </Quadro>
          </div>

          {/* Tabela por aluno */}
          <section className="cartao p-5">
            <h2 className="text-base font-semibold text-roxo">Desempenho por aluno</h2>
            <p className="mt-1 text-xs text-slate-500">Ordenado da menor para a maior média (quem precisa de atenção primeiro).</p>
            <div className="mt-3 max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="sticky top-0 border-b border-slate-200 bg-white text-left text-xs uppercase text-slate-500">
                    <th className="py-2 pr-3">Aluno</th>
                    <th className="py-2 pr-3">Turma</th>
                    <th className="py-2 pr-3">Disciplina</th>
                    <th className="py-2 pr-3">Média</th>
                    <th className="py-2 pr-3">Avaliações</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.porAluno.map((a) => (
                    <tr key={`${a.alunoId}-${a.disciplina}`} className="border-b border-slate-100">
                      <td className="py-1.5 pr-3 font-medium text-grafite">{a.aluno}</td>
                      <td className="py-1.5 pr-3 text-slate-600">{a.turma}</td>
                      <td className="py-1.5 pr-3 text-slate-600">{disc(a.disciplina)}</td>
                      <td className={`py-1.5 pr-3 font-medium ${a.media < 60 ? "text-red-600" : "text-green-700"}`}>{a.media}%</td>
                      <td className="py-1.5 pr-3 text-slate-600">{a.avaliacoes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
