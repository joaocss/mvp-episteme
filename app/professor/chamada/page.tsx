import { exigirPapel } from "../../../lib/sessaoServidor";
import { turmasDisciplinasDoProfessor } from "../../../src/bd/treinos";
import { listarTurmas } from "../../../src/bd/gestao";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import Chamada from "./Chamada";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaChamada() {
  const sessao = await exigirPapel(["professor", "gestor", "admin"]);

  // Professor: suas turmas (distintas). Gestor/admin: todas da escola.
  let turmas: { id: string; nome: string }[];
  if (sessao.papel === "professor") {
    const td = await turmasDisciplinasDoProfessor(sessao.escolaId, sessao.usuarioId);
    const vistas = new Set<string>();
    turmas = td.filter((t) => !vistas.has(t.turmaId) && vistas.add(t.turmaId)).map((t) => ({ id: t.turmaId, nome: t.turma }));
  } else {
    turmas = (await listarTurmas(sessao.escolaId)).map((t) => ({ id: t.id, nome: t.nome }));
  }

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Chamada"
        subtitulo="Marque presença ou ausência da turma. As ausências avisam o responsável e o aluno."
      />
      <div className="mt-6">
        <Chamada turmas={turmas} />
      </div>
    </LayoutApp>
  );
}
