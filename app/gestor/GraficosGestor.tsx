"use client";

// Graficos do painel gestor (Recharts), temados com a identidade Episteme.
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";

const ROXO = "#3B2C63";
const DOURADO = "#C79A3B";
const ROXO_CLARO = "#7A6AA5";

interface Props {
  alunos: number;
  professores: number;
  porDia: { dia: string; total: number }[];
  ativos: { aluno: string; perguntas: number }[];
}

function Quadro({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="cartao p-5">
      <h2 className="text-lg font-semibold text-roxo">{titulo}</h2>
      <div className="mt-4 h-56 w-full">{children}</div>
    </section>
  );
}

export default function GraficosGestor({ alunos, professores, porDia, ativos }: Props) {
  const composicao = [
    { nome: "Alunos", valor: alunos },
    { nome: "Professores", valor: professores },
  ];
  const semDados = alunos + professores === 0;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Quadro titulo="Alunos × Professores">
        {semDados ? (
          <p className="text-slate-500">Ainda não há dados.</p>
        ) : (
          <ResponsiveContainer>
            <PieChart>
              <Pie data={composicao} dataKey="valor" nameKey="nome" innerRadius={50} outerRadius={80} paddingAngle={2}>
                <Cell fill={ROXO} />
                <Cell fill={DOURADO} />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Quadro>

      <Quadro titulo="Perguntas por dia">
        {porDia.length === 0 ? (
          <p className="text-slate-500">Ainda não há dados.</p>
        ) : (
          <ResponsiveContainer>
            <AreaChart data={porDia} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-perguntas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ROXO} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={ROXO} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke={ROXO} strokeWidth={2} fill="url(#grad-perguntas)" name="Perguntas" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Quadro>

      <Quadro titulo="Alunos mais ativos">
        {ativos.length === 0 ? (
          <p className="text-slate-500">Ainda não há dados.</p>
        ) : (
          <ResponsiveContainer>
            <BarChart data={ativos} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="aluno" width={110} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="perguntas" fill={ROXO_CLARO} radius={[0, 4, 4, 0]} name="Perguntas" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Quadro>
    </div>
  );
}
