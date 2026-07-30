// Tela de "Escolha seu perfil" — PUBLICA, exibida ANTES do login (Fase 7).
// O aluno/professor/gestor clica no proprio modulo e so entao faz login;
// depois de autenticado, cai direto no seu painel (ve so o que e do papel
// dele) sem passar de novo por essa grade com os outros modulos visiveis.
import Link from "next/link";
import { Marca } from "../componentes/Marca";
import { Cartao, CartaoCabecalho, CartaoTitulo, CartaoDescricao, CartaoConteudo } from "../componentes/ui/Cartao";
import { variantesBotao } from "../componentes/ui/Botao";

interface Painel { papel: string; titulo: string; descricao: string; futuro?: boolean; }

const PAINEIS: Painel[] = [
  { papel: "gestor", titulo: "Gestor", descricao: "Indicadores da escola, turmas, professores e alunos." },
  { papel: "professor", titulo: "Professor", descricao: "Provas, planejamento e acompanhamento das turmas." },
  { papel: "aluno", titulo: "Aluno", descricao: "Tutor de IA, provas e feedback do seu aprendizado." },
  { papel: "responsavel", titulo: "Responsável", descricao: "Acompanhamento do estudante (em breve).", futuro: true },
];

export default function PaginaPaineis() {
  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Marca />

        <section className="mt-12">
          <h1 className="text-3xl font-bold text-grafite">Qual é o seu perfil?</h1>
          <p className="mt-2 text-slate-700">Escolha o seu módulo para entrar com a sua conta.</p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {PAINEIS.map((p) => (
              <Cartao key={p.papel} className={p.futuro ? "flex flex-col opacity-60" : "flex flex-col"}>
                <CartaoCabecalho>
                  <CartaoTitulo>{p.titulo}</CartaoTitulo>
                  <CartaoDescricao>{p.descricao}</CartaoDescricao>
                </CartaoCabecalho>
                <CartaoConteudo className="mt-auto">
                  {p.futuro ? (
                    <span className={variantesBotao({ variante: "secundario" }) + " cursor-not-allowed"} aria-disabled="true">
                      Em breve
                    </span>
                  ) : (
                    <Link href={`/login?papel=${p.papel}`} className={variantesBotao({ variante: "primario" })}>
                      Entrar como {p.titulo}
                    </Link>
                  )}
                </CartaoConteudo>
              </Cartao>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
