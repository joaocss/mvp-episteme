import Link from "next/link";
import { Icone } from "./componentes/ui/Icone";

const PILARES = [
  {
    icone: "materiais" as const,
    titulo: "Ancorado na fonte",
    texto: "Cada resposta parte do material da propria escola (RAG), com rastreio dos trechos usados.",
  },
  {
    icone: "tutor" as const,
    titulo: "Ensina a pensar",
    texto: "Conduz o aluno pelo caminho da solucao passo a passo, combatendo a descarga cognitiva.",
  },
  {
    icone: "desempenho" as const,
    titulo: "Visao para a gestao",
    texto: "Professores e diretores acompanham engajamento, notas e alertas em tempo real.",
  },
];

export default function Inicio() {
  return (
    <main className="min-h-screen bg-tela">
      {/* Cabecalho */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-roxo text-dourado">
            <Icone nome="bussola" className="h-6 w-6" />
          </span>
          <span className="font-titulo text-xl font-bold text-roxo">Episteme</span>
        </div>
        <Link href="/paineis" className="btn-secundario">Entrar</Link>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 sm:pt-16">
          <p className="font-titulo text-sm uppercase tracking-[0.2em] text-dourado-escuro">
            Inteligencia que ensina a pensar
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-grafite sm:text-5xl">
            O tutor de IA que ensina a partir do material da sua escola.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Episteme e a plataforma educacional que transforma o conteudo de cada turma em um tutor
            inteligente. Em vez de entregar a resposta pronta, conduz o raciocinio — e da ao professor
            e ao gestor uma visao completa do aprendizado.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/paineis" className="btn-primario">
              Acessar a plataforma
              <Icone nome="seta" className="h-4 w-4" />
            </Link>
            <Link href="/login?papel=aluno" className="btn-secundario">Sou aluno</Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gradiente-marca opacity-10 blur-3xl" />
      </section>

      {/* Pilares */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-5 sm:grid-cols-3">
          {PILARES.map((p) => (
            <div key={p.titulo} className="cartao p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-roxo-suave text-roxo">
                <Icone nome={p.icone} className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-roxo">{p.titulo}</h2>
              <p className="mt-2 text-sm text-slate-600">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-borda py-6">
        <p className="mx-auto max-w-6xl px-6 text-sm text-slate-400">
          Episteme — inteligencia que ensina a pensar.
        </p>
      </footer>
    </main>
  );
}
