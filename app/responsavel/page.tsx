import { exigirPapel } from "../../lib/sessaoServidor";
import { obterUsuarioBasico } from "../../src/bd/usuarios";
import { filhosDoResponsavel, resumoFilho } from "../../src/bd/responsavel";
import { LayoutApp } from "../componentes/LayoutApp";
import { CabecalhoPagina } from "../componentes/ui/CabecalhoPagina";
import { Cartao } from "../componentes/ui/Cartao";
import { Selo } from "../componentes/ui/Selo";
import { Icone } from "../componentes/ui/Icone";
import { EstadoVazio } from "../componentes/ui/EstadoVazio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROTULO_DISC: Record<string, string> = { matematica: "Matematica", portugues: "Lingua Portuguesa", historia: "Historia" };

export default async function PaginaResponsavel() {
  const sessao = await exigirPapel(["responsavel"]);
  const usuario = await obterUsuarioBasico(sessao.escolaId, sessao.usuarioId);
  const email = usuario?.email ?? "";
  const filhos = email ? await filhosDoResponsavel(sessao.escolaId, email) : [];
  const comResumo = await Promise.all(
    filhos.map(async (f) => ({ filho: f, resumo: await resumoFilho(sessao.escolaId, email, f.alunoId) })),
  );

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Acompanhamento"
        subtitulo="Acompanhe o desempenho e a rotina do seu filho na escola. Esta visao e somente de leitura."
      />
      <div className="mt-6 space-y-6">
        {comResumo.length === 0 ? (
          <EstadoVazio
            icone="alunos"
            titulo="Nenhum aluno vinculado"
            descricao="Seu cadastro ainda nao esta vinculado a um aluno. Fale com a secretaria da escola para vincular o seu e-mail ao aluno."
          />
        ) : (
          comResumo.map(({ filho, resumo }) => (
            <Cartao key={filho.alunoId} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-roxo-suave text-roxo">
                    <Icone nome="usuario" className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-grafite">{filho.nome}</h2>
                    <p className="text-sm text-slate-500">
                      {filho.turma ?? "sem turma"}{filho.serie ? ` · ${filho.serie}` : ""} · {filho.parentesco}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Selo cor="sucesso">{resumo?.faltasJustificadas ?? 0} faltas justificadas</Selo>
                  <Selo cor={resumo && resumo.faltasNaoJustificadas > 0 ? "alerta" : "neutro"}>
                    {resumo?.faltasNaoJustificadas ?? 0} nao justificadas
                  </Selo>
                  <Selo cor="roxo">{resumo?.treinosConcluidos ?? 0} treinos concluidos</Selo>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notas recentes</h3>
                  {resumo && resumo.notasRecentes.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {resumo.notasRecentes.map((n, i) => {
                        const pct = n.notaMaxima > 0 ? (n.valor / n.notaMaxima) : 0;
                        return (
                          <li key={i} className="flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate text-grafite">
                              <span className="text-slate-400">{ROTULO_DISC[n.disciplina] ?? n.disciplina}:</span> {n.descricao}
                            </span>
                            <span className={`shrink-0 font-medium ${pct < 0.6 ? "text-alerta" : "text-sucesso"}`}>
                              {n.valor}/{n.notaMaxima}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">Nenhuma nota lançada ainda.</p>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Atividade no tutor de IA</h3>
                  <p className="mt-2 text-sm text-grafite">
                    {resumo?.ultimaAtividadeTutor
                      ? `Última interação em ${new Date(resumo.ultimaAtividadeTutor).toLocaleDateString("pt-BR")}.`
                      : "Ainda não usou o tutor de IA."}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    O Episteme usa a IA como parceira que ensina a pensar — ela dá pistas, não respostas prontas.
                  </p>
                </div>
              </div>
            </Cartao>
          ))
        )}
      </div>
    </LayoutApp>
  );
}
