import Link from "next/link";
import { exigirPapel } from "../../lib/sessaoServidor";
import {
  kpisGestor, perguntasPorDia, alunosMaisAtivos, mediaNotasPorTurma, taxaAprovacaoPorTurma, evasaoAlunos,
} from "../../src/bd/gestor";
import { obterConfigEscola } from "../../src/bd/configEscola";
import { LayoutApp } from "../componentes/LayoutApp";
import { CabecalhoPagina } from "../componentes/ui/CabecalhoPagina";
import { Kpi } from "../componentes/ui/Kpi";
import { variantesBotao } from "../componentes/ui/Botao";
import GraficosGestor from "./GraficosGestor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaGestor() {
  const sessao = await exigirPapel(["gestor", "admin"]);

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
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo={`Painel do Gestor`}
        subtitulo={`Visao geral de ${config.nome || "sua escola"}`}
        acoes={
          <>
            <Link href="/gestor/gestao" className={variantesBotao({ variante: "secundario", tamanho: "pequeno" })}>
              Cadastros
            </Link>
            <Link href="/gestor/materiais" className={variantesBotao({ variante: "primario", tamanho: "pequeno" })}>
              Materiais
            </Link>
          </>
        }
      />

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5" aria-label="Indicadores">
        <Kpi rotulo="Alunos" valor={kpis.alunos} icone="alunos" />
        <Kpi rotulo="Professores" valor={kpis.professores} icone="cadastros" />
        <Kpi rotulo="Sessoes" valor={kpis.sessoes} icone="tutor" />
        <Kpi rotulo="Perguntas" valor={kpis.perguntas} icone="desempenho" />
        <Kpi rotulo="Alertas" valor={kpis.alertas} icone="logs" destaque ativoDestaque={kpis.alertas > 0} />
      </section>

      <section className="mt-8">
        <GraficosGestor
          alunos={kpis.alunos}
          professores={kpis.professores}
          porDia={porDia}
          ativos={ativos}
          mediaNotas={mediaNotas}
          aprovacao={aprovacao}
          evasao={evasao}
        />
      </section>
    </LayoutApp>
  );
}
