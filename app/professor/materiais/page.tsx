import { exigirPapel } from "../../../lib/sessaoServidor";
import { listarTurmas } from "../../../src/bd/gestao";
import { listarDisciplinas } from "../../../src/bd/disciplinas";
import { listarMateriais } from "../../../src/bd/materiais";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import GestaoMateriais from "../../componentes/GestaoMateriais";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaMateriaisProfessor() {
  const sessao = await exigirPapel(["professor"]);

  const [turmas, disciplinas, materiais] = await Promise.all([
    listarTurmas(sessao.escolaId),
    listarDisciplinas(sessao.escolaId),
    listarMateriais(sessao.escolaId),
  ]);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Materiais do tutor"
        subtitulo="Envie PDFs e vincule as suas turmas. O tutor de IA passa a usar esse conteudo como fonte para os alunos da turma."
      />
      <div className="mt-6">
        <GestaoMateriais
          turmas={turmas.map((t) => ({ id: t.id, nome: t.nome, serie: t.serie }))}
          disciplinasIniciais={disciplinas}
          materiaisIniciais={materiais}
          ehGestor={false}
        />
      </div>
    </LayoutApp>
  );
}
