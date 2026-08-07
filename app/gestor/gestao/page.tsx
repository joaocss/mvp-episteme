import { exigirPapel } from "../../../lib/sessaoServidor";
import { listarTurmas, listarProfessores, listarAlunosGeral, estruturaTurmas } from "../../../src/bd/gestao";
import { listarDisciplinas } from "../../../src/bd/disciplinas";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import FormulariosGestao from "./FormulariosGestao";
import TabelasGestao from "./TabelasGestao";
import EstruturaAcademica from "./EstruturaAcademica";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaGestao() {
  const sessao = await exigirPapel(["gestor", "admin"]);

  const [turmas, professores, alunos, disciplinas, estrutura] = await Promise.all([
    listarTurmas(sessao.escolaId),
    listarProfessores(sessao.escolaId),
    listarAlunosGeral(sessao.escolaId),
    listarDisciplinas(sessao.escolaId),
    estruturaTurmas(sessao.escolaId),
  ]);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina titulo="Cadastros" subtitulo="Turmas, disciplinas, professores e alunos da escola" />

      <section className="mt-6">
        <h2 className="mb-3 font-semibold text-grafite">Novo cadastro</h2>
        <FormulariosGestao
          turmas={turmas.map((t) => ({ id: t.id, nome: t.nome }))}
          professores={professores.map((p) => ({ id: p.id, nome: p.nome }))}
          disciplinas={disciplinas}
        />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-semibold text-grafite">Estrutura acadêmica</h2>
        <EstruturaAcademica estrutura={estrutura} disciplinas={disciplinas} nomeDisciplina={Object.fromEntries(disciplinas.map((d) => [d.slug, d.nome]))} />
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
