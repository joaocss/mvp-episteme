// Tela de "Escolha seu perfil" — PUBLICA, exibida ANTES do login (Fase 7).
// O aluno/professor/gestor clica no proprio modulo e so entao faz login;
// depois de autenticado, cai direto no seu painel (ve so o que e do papel
// dele) sem passar de novo por essa grade com os outros modulos visiveis.
import Link from "next/link";
import { Icone, type NomeIcone } from "../componentes/ui/Icone";

interface Painel { papel: string; titulo: string; descricao: string; icone: NomeIcone; futuro?: boolean; }

const PAINEIS: Painel[] = [
  { papel: "gestor", titulo: "Gestor", icone: "painel", descricao: "Indicadores da escola, turmas, professores e alunos." },
  { papel: "professor", titulo: "Professor", icone: "provas", descricao: "Provas, planejamento e acompanhamento das turmas." },
  { papel: "aluno", titulo: "Aluno", icone: "tutor", descricao: "Tutor de IA, provas e feedback do seu aprendizado." },
  { papel: "responsavel", titulo: "Responsavel", icone: "usuario", descricao: "Acompanhamento do estudante (em breve).", futuro: true },
];

export default function PaginaPaineis() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Lado da marca */}
      <div className="relative hidden flex-col justify-between bg-gradiente-roxo p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-dourado">
            <Icone nome="bussola" className="h-6 w-6" />
          </span>
          <span className="font-titulo text-xl font-bold">Episteme</span>
        </div>
        <div>
          <p className="font-titulo text-sm uppercase tracking-[0.2em] text-dourado">Bem-vindo</p>
          <h2 className="mt-3 max-w-sm text-3xl font-bold leading-snug">
            A inteligencia que ensina a pensar, para toda a escola.
          </h2>
          <p className="mt-4 max-w-sm text-white/70">
            Entre pelo seu perfil para acessar as ferramentas certas para voce.
          </p>
        </div>
        <p className="text-sm text-white/40">Inteligencia que ensina a pensar.</p>
      </div>

      {/* Lado da escolha */}
      <div className="flex items-center justify-center bg-tela px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-grafite">Qual e o seu perfil?</h1>
          <p className="mt-2 text-slate-500">Escolha o seu modulo para entrar com a sua conta.</p>

          <div className="mt-8 space-y-3">
            {PAINEIS.map((p) =>
              p.futuro ? (
                <div
                  key={p.papel}
                  className="flex items-center gap-4 rounded-xl border border-borda bg-superficie/60 p-4 opacity-60"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <Icone nome={p.icone} className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-grafite">{p.titulo}</p>
                    <p className="text-sm text-slate-500">{p.descricao}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                    Em breve
                  </span>
                </div>
              ) : (
                <Link
                  key={p.papel}
                  href={`/login?papel=${p.papel}`}
                  className="group flex items-center gap-4 rounded-xl border border-borda bg-superficie p-4 shadow-cartao transition hover:border-roxo/30 hover:shadow-elevado"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-roxo-suave text-roxo transition group-hover:bg-roxo group-hover:text-white">
                    <Icone nome={p.icone} className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-grafite">{p.titulo}</p>
                    <p className="text-sm text-slate-500">{p.descricao}</p>
                  </div>
                  <Icone nome="seta" className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-roxo" />
                </Link>
              ),
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
