import { exigirPapel } from "../../../lib/sessaoServidor";
import { obterConfigEscola } from "../../../src/bd/configEscola";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import ConfiguracoesForm from "./ConfiguracoesForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaConfiguracoes() {
  const sessao = await exigirPapel(["gestor", "admin"]);
  const config = await obterConfigEscola(sessao.escolaId);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Configuracoes da escola"
        subtitulo="Personalize o nome e a logo exibidos no painel e defina a escala de nota usada nas provas, notas lancadas e nos dashboards."
      />
      <div className="mt-6">
        <ConfiguracoesForm nome={config.nome} logoUrl={config.logoUrl} notaMaxima={config.notaMaxima} notaMinimaAprovacao={config.notaMinimaAprovacao} />
      </div>
    </LayoutApp>
  );
}
