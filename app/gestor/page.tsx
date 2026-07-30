import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { lerToken } from "../../lib/sessao";
import {
  kpisGestor, perguntasPorDia, alunosMaisAtivos, mediaNotasPorTurma, taxaAprovacaoPorTurma, evasaoAlunos,
} from "../../src/bd/gestor";
import { obterConfigEscola } from "../../src/bd/configEscola";
import { Marca } from "../componentes/Marca";
import { variantesBotao } from "../componentes/ui/Botao";
import GraficosGestor from "./GraficosGestor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function Kpi({ rotulo, valor, alerta = false }: { rotulo: string; valor: number; alerta?: boolean }) {
  return (
    <div className={`cartao p-5 ${alerta && valor > 0 ? "border-alerta/40 bg-red-50" : ""}`}>
      <p className="text-sm text-slate-500">{rotulo}</p>
      <p className={`mt-1 text-3xl font-bold ${alerta && valor > 0 ? "text-alerta" : "text-grafite"}`}>{valor}</p>
    </div>
  );
}

export default async function PaginaGestor() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) redirect("/login");

  const [kpis, porDia, ativos, mediaNotas, aprovacao, evasao, config] = await Promise.all([
    kpisGestor(sessao.escolaId),
    perguntasPorDia(sessao.escolaId),
    alunosMaisAtivos(sessao.escolaId),
    mediaNotasPorTurma(sessao.escolaId),
    taxaAprovacaoPorTurma(sessao.escolaId),
    evasaoAlunos(sessao.escolaId),
    obterConfigEscola(sessao.escolaId),
  ]);

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-5xl p-6">
        <Marca
          compacto
          acoes={
            <>
              <Link href="/gestor/gestao" className={variantesBotao({ variante: "secundario", tamanho: "pequeno" })}>
                Gestão / Cadastros
              </Link>
              <Link href="/gestor/desempenho" className={variantesBotao({ variante: "secundario", tamanho: "pequeno" })}>
                Desempenho
              </Link>
              <Link href="/gestor/logs" className={variantesBotao({ variante: "secundario", tamanho: "pequeno" })}>
                Logs e Alertas
              </Link>
              <Link href="/gestor/configuracoes" className={variantesBotao({ variante: "secundario", tamanho: "pequeno" })}>
                Configurações
              </Link>
              <form action="/auth/sair" method="post">
                <button type="submit" className="min-h-[44px] text-sm text-slate-500 hover:text-grafite">Sair</button>
              </form>
            </>
          }
        />

        <div className="mt-6 flex items-center gap-3">
          {config.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logoUrl} alt="Logo da escola" className="h-10 w-auto rounded object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-grafite">Painel Gestor — {config.nome || "Escola"}</h1>
            <p className="text-sm text-slate-500">Visão geral da escola</p>
          </div>
        </div>

        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5" aria-label="Indicadores">
          <Kpi rotulo="Alunos" valor={kpis.alunos} />
          <Kpi rotulo="Professores" valor={kpis.professores} />
          <Kpi rotulo="Sessões" valor={kpis.sessoes} />
          <Kpi rotulo="Perguntas" valor={kpis.perguntas} />
          <Kpi rotulo="Alertas" valor={kpis.alertas} alerta />
        </section>

        <div className="mt-8">
          <GraficosGestor
            alunos={kpis.alunos}
            professores={kpis.professores}
            porDia={porDia}
            ativos={ativos}
            mediaNotas={mediaNotas}
            aprovacao={aprovacao}
            evasao={evasao}
          />
        </div>
      </div>
    </main>
  );
}
