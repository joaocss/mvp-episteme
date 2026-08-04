import { exigirPapel } from "../../../lib/sessaoServidor";
import { listarTurmas } from "../../../src/bd/gestao";
import { listarDisciplinas } from "../../../src/bd/disciplinas";
import { listarMateriais } from "../../../src/bd/materiais";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import GestaoMateriais from "../../componentes/GestaoMateriais";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaMateriaisGestor() {
  const sessao = await exigirPapel(["gestor", "admin"]);

  const [turmas, disciplinas, materiais] = await Promise.all([
    listarTurmas(sessao.escolaId),
    listarDisciplinas(sessao.escolaId),
    listarMateriais(sessao.escolaId),
  ]);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Materiais e conteudo por turma"
        subtitulo="Envie PDFs (apostilas, listas, capitulos) e vincule as turmas. O tutor de IA usa esse conteudo como fonte, restrito a turma."
      />
      <div className="mt-6">
        <GestaoMateriais
          turmas={turmas.map((t) => ({ id: t.id, nome: t.nome, serie: t.serie, modoEstrito: t.modoEstrito }))}
          disciplinasIniciais={disciplinas}
          materiaisIniciais={materiais}
          ehGestor
        />
      </div>
    </LayoutApp>
  );
}
