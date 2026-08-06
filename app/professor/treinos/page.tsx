import { exigirPapel } from "../../../lib/sessaoServidor";
import { listarTreinosDoProfessor, turmasDisciplinasDoProfessor } from "../../../src/bd/treinos";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import GestaoTreinos from "../../componentes/GestaoTreinos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaTreinosProfessor() {
  const sessao = await exigirPapel(["professor", "admin"]);
  const [turmas, treinos] = await Promise.all([
    turmasDisciplinasDoProfessor(sessao.escolaId, sessao.usuarioId),
    listarTreinosDoProfessor(sessao.escolaId, sessao.usuarioId),
  ]);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Modo Treinador"
        subtitulo="Dever de casa que ensina a pensar: a IA da pistas e registra o processo do aluno, sem entregar a resposta."
      />
      <div className="mt-6">
        <GestaoTreinos turmas={turmas} treinosIniciais={treinos} />
      </div>
    </LayoutApp>
  );
}
