import Link from "next/link";
import { Marca } from "./componentes/Marca";

export default function Inicio() {
  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Marca />

        <section className="mt-16">
          <p className="font-titulo text-sm uppercase tracking-widest text-dourado-escuro">
            Inteligência que ensina a pensar
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-grafite">
            Tutor de Matemática — 6º ano
          </h1>
          <p className="mt-4 max-w-prose text-lg text-slate-700">
            Um tutor de IA que responde às dúvidas ancorado no livro didático e na BNCC.
            Em vez de entregar a resposta pronta, conduz o raciocínio passo a passo.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/tutor" className="btn-primario">Abrir o tutor</Link>
            <Link href="/paineis" className="btn-secundario">Entrar</Link>
          </div>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { titulo: "Ancorado na fonte", texto: "Respostas embasadas no material da escola, com rastreio dos trechos usados." },
            { titulo: "Ensina a pensar", texto: "Guia o aluno pelo caminho da solução, combatendo a descarga cognitiva." },
            { titulo: "Feito para a idade", texto: "Linguagem simples, telas enxutas e alvos de toque generosos." },
          ].map((c) => (
            <div key={c.titulo} className="cartao p-5">
              <h2 className="text-lg font-semibold text-roxo">{c.titulo}</h2>
              <p className="mt-2 text-sm text-slate-600">{c.texto}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
