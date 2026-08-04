import { exigirPapel } from "../../../lib/sessaoServidor";
import { alunosPorTurmaProfessor, desempenhoProvasProfessor } from "../../../src/bd/professor";
import { obterConfigEscola } from "../../../src/bd/configEscola";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import { EstadoVazio } from "../../componentes/ui/EstadoVazio";
import DesempenhoTurma from "./DesempenhoTurma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaDesempenhoProfessor() {
  const sessao = await exigirPapel(["professor"]);

  const [turmas, desempenho, config] = await Promise.all([
    alunosPorTurmaProfessor(sessao.usuarioId),
    desempenhoProvasProfessor(sessao.escolaId, sessao.usuarioId),
    obterConfigEscola(sessao.escolaId),
  ]);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina titulo="Desempenho e notas" subtitulo="Resultados das provas e lancamento de notas e faltas" />

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-grafite">Notas e acertos por prova</h2>
        {desempenho.length === 0 ? (
          <div className="mt-3">
            <EstadoVazio icone="desempenho" titulo="Sem provas com respostas" descricao="Assim que suas provas forem respondidas, os resultados aparecem aqui." />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto cartao">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-borda text-slate-500">
                <tr>
                  <th className="p-3">Turma</th><th className="p-3">Prova</th><th className="p-3">Aluno</th>
                  <th className="p-3">Acertos (objetivas)</th><th className="p-3">Nota media</th>
                </tr>
              </thead>
              <tbody>
                {desempenho.map((d, i) => (
                  <tr key={i} className="border-b border-borda/60">
                    <td className="p-3">{d.turma}</td>
                    <td className="p-3">{d.tituloProva}</td>
                    <td className="p-3">{d.aluno}</td>
                    <td className="p-3">{d.acertosObjetivas}/{d.totalObjetivas}</td>
                    <td className="p-3 font-medium">{d.notaMedia}/{config.notaMaxima}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-grafite">Lancar notas e faltas por turma</h2>
        {turmas.length === 0 ? (
          <div className="mt-3">
            <EstadoVazio icone="cadastros" titulo="Sem turmas vinculadas" descricao="Voce ainda nao esta vinculado a nenhuma turma. Fale com a gestao." />
          </div>
        ) : (
          <div className="mt-3">
            <DesempenhoTurma turmas={turmas} notaMaxima={config.notaMaxima} />
          </div>
        )}
      </section>
    </LayoutApp>
  );
}
