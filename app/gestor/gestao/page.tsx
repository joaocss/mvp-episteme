import { exigirPapel } from "../../../lib/sessaoServidor";
import { listarTurmas, listarProfessores, listarAlunosGeral } from "../../../src/bd/gestao";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import FormulariosGestao from "./FormulariosGestao";
import TabelasGestao from "./TabelasGestao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaGestao() {
  const sessao = await exigirPapel(["gestor", "admin"]);

  const [turmas, professores, alunos] = await Promise.all([
    listarTurmas(sessao.escolaId),
    listarProfessores(sessao.escolaId),
    listarAlunosGeral(sessao.escolaId),
  ]);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina titulo="Cadastros" subtitulo="Turmas, professores e alunos da escola" />

      <section className="mt-6">
        <h2 className="mb-3 font-semibold text-grafite">Novo cadastro</h2>
        <FormulariosGestao
          turmas={turmas.map((t) => ({ id: t.id, nome: t.nome }))}
          professores={professores.map((p) => ({ id: p.id, nome: p.nome }))}
        />
      </section>

      <section className="mt-10">
        <TabelasGestao
          turmas={turmas}
          professores={professores}
          alunos={alunos}
          turmasOpcoes={turmas.map((t) => ({ id: t.id, nome: t.nome }))}
        />
      </section>
    </LayoutApp>
  );
}
