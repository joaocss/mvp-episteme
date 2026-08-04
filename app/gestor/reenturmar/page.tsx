import { exigirPapel } from "../../../lib/sessaoServidor";
import { listarTurmas, listarAlunosGeral } from "../../../src/bd/gestao";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import ReenturmarAlunos from "./ReenturmarAlunos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaReenturmar() {
  const sessao = await exigirPapel(["gestor", "admin"]);

  const [turmas, alunos] = await Promise.all([
    listarTurmas(sessao.escolaId),
    listarAlunosGeral(sessao.escolaId),
  ]);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Reenturmacao de alunos"
        subtitulo="Mova alunos entre turmas em lote — util na virada de ano letivo. Filtre pela turma de origem, selecione os alunos e escolha a turma destino."
      />
      <div className="mt-6">
        <ReenturmarAlunos
          alunos={alunos.map((a) => ({ id: a.id, nome: a.nome, turma: a.turma, turmaId: a.turmaId }))}
          turmas={turmas.map((t) => ({ id: t.id, nome: t.nome, serie: t.serie }))}
        />
      </div>
    </LayoutApp>
  );
}
