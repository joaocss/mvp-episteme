import { exigirPapel } from "../../../lib/sessaoServidor";
import { listarTurmas } from "../../../src/bd/gestao";
import { listarDisciplinas } from "../../../src/bd/disciplinas";
import { gerarRelatorio } from "../../../src/bd/relatorios";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import RelatoriosDesempenho from "./RelatoriosDesempenho";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaRelatorios() {
  const sessao = await exigirPapel(["gestor", "admin"]);

  const [turmas, disciplinas, inicial] = await Promise.all([
    listarTurmas(sessao.escolaId),
    listarDisciplinas(sessao.escolaId),
    gerarRelatorio(sessao.escolaId, {}),
  ]);

  const rotuloDisciplina = Object.fromEntries(disciplinas.map((d) => [d.slug, d.nome]));

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Relatorios de desempenho"
        subtitulo="Filtre por turma, disciplina e periodo. As notas sao normalizadas em percentual para comparar disciplinas com escalas diferentes."
      />
      <div className="mt-6">
        <RelatoriosDesempenho
          turmas={turmas.map((t) => ({ id: t.id, nome: t.nome }))}
          disciplinas={disciplinas.map((d) => ({ slug: d.slug, nome: d.nome }))}
          inicial={inicial}
          rotuloDisciplina={rotuloDisciplina}
        />
      </div>
    </LayoutApp>
  );
}
