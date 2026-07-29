// Tela de "Paineis de Acesso" pos-login: cartoes por perfil.
// Cada cartao so e clicavel se o papel do usuario permitir (RBAC tambem
// validado na rota de destino). "admin" enxerga todos.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { lerToken } from "../../lib/sessao";
import { Marca } from "../componentes/Marca";
import { Cartao, CartaoCabecalho, CartaoTitulo, CartaoDescricao, CartaoConteudo } from "../componentes/ui/Cartao";
import { variantesBotao } from "../componentes/ui/Botao";
import { cn } from "../../lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Painel { papel: string; titulo: string; descricao: string; rota: string; futuro?: boolean; }

const PAINEIS: Painel[] = [
  { papel: "gestor", titulo: "Gestor", descricao: "Indicadores da escola, turmas, professores e alunos.", rota: "/dashboard/gestor" },
  { papel: "professor", titulo: "Professor", descricao: "Provas, planejamento e acompanhamento das turmas.", rota: "/dashboard/professor" },
  { papel: "aluno", titulo: "Aluno", descricao: "Tutor de IA, provas e feedback do seu aprendizado.", rota: "/dashboard/aluno" },
  { papel: "responsavel", titulo: "Responsável", descricao: "Acompanhamento do estudante (em breve).", rota: "#", futuro: true },
];

export default async function PaginaPaineis() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao) redirect("/login");

  function temAcesso(papel: string): boolean {
    return sessao!.papel === "admin" || sessao!.papel === papel;
  }

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Marca
          acoes={
            <form action="/auth/sair" method="post">
              <button type="submit" className="min-h-[44px] text-sm text-slate-500 hover:text-grafite">Sair</button>
            </form>
          }
        />

        <section className="mt-12">
          <h1 className="text-3xl font-bold text-grafite">Painéis de acesso</h1>
          <p className="mt-2 text-slate-700">Escolha o painel para continuar.</p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {PAINEIS.map((p) => {
              const acesso = temAcesso(p.papel) && !p.futuro;
              return (
                <Cartao key={p.papel} className={cn("flex flex-col", !acesso && "opacity-60")}>
                  <CartaoCabecalho>
                    <CartaoTitulo>{p.titulo}</CartaoTitulo>
                    <CartaoDescricao>{p.descricao}</CartaoDescricao>
                  </CartaoCabecalho>
                  <CartaoConteudo className="mt-auto">
                    {acesso ? (
                      <Link href={p.rota} className={variantesBotao({ variante: "primario" })}>
                        Abrir painel
                      </Link>
                    ) : (
                      <span className={cn(variantesBotao({ variante: "secundario" }), "cursor-not-allowed")}
                        aria-disabled="true">
                        {p.futuro ? "Em breve" : "Sem acesso"}
                      </span>
                    )}
                  </CartaoConteudo>
                </Cartao>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
