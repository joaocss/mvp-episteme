import { notFound } from "next/navigation";
import { exigirPapel } from "../../../../lib/sessaoServidor";
import {
  obterTreinoDoProfessor, sessoesDoTreino, historicoTreino,
  type InteracaoTreino,
} from "../../../../src/bd/treinos";
import { LayoutApp } from "../../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../../componentes/ui/CabecalhoPagina";
import { Cartao } from "../../../componentes/ui/Cartao";
import { Selo } from "../../../componentes/ui/Selo";
import { EstadoVazio } from "../../../componentes/ui/EstadoVazio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROTULO_TIPO: Record<string, string> = {
  tentativa: "Tentativa", pista: "Pista da IA", resposta_final: "Resposta final", reflexao: "Reflexao", sistema: "Sistema",
};

function LinhaProcesso({ i }: { i: InteracaoTreino }) {
  const doAluno = i.autor === "aluno";
  return (
    <div className={`rounded-lg border p-3 text-sm ${doAluno ? "border-borda bg-tela" : "border-roxo/20 bg-roxo-suave/40"}`}>
      <div className="mb-1 flex items-center gap-2">
        <Selo cor={i.tipo === "pista" ? "roxo" : i.tipo === "resposta_final" ? "sucesso" : i.tipo === "reflexao" ? "dourado" : "neutro"}>
          {ROTULO_TIPO[i.tipo] ?? i.tipo}
        </Selo>
        <span className="text-xs text-slate-400">{new Date(i.criadoEm).toLocaleString("pt-BR")}</span>
      </div>
      <p className="whitespace-pre-wrap text-grafite">{i.conteudo}</p>
    </div>
  );
}

export default async function PaginaProcessoTreino({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await exigirPapel(["professor", "admin"]);
  const treino = await obterTreinoDoProfessor(sessao.escolaId, sessao.usuarioId, id);
  if (!treino) notFound();

  const sessoes = await sessoesDoTreino(sessao.escolaId, id);
  const processos = await Promise.all(
    sessoes.map(async (s) => ({ sessao: s, logs: await historicoTreino(sessao.escolaId, s.id) })),
  );

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo={treino.titulo}
        subtitulo={`${treino.turmaNome ?? ""} · processo dos alunos`}
      />

      <div className="mt-6 space-y-6">
        <Cartao className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Enunciado</h2>
          <p className="mt-2 whitespace-pre-wrap text-grafite">{treino.enunciado}</p>
          {treino.objetivo && <p className="mt-3 text-sm text-slate-500"><strong>Objetivo:</strong> {treino.objetivo}</p>}
        </Cartao>

        {processos.length === 0 ? (
          <EstadoVazio icone="treino" titulo="Nenhum aluno comecou" descricao="Quando os alunos iniciarem o treino, o processo deles aparece aqui." />
        ) : (
          processos.map(({ sessao: s, logs }) => (
            <Cartao key={s.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-grafite">{s.alunoNome}</h3>
                  <Selo cor={s.status === "concluido" ? "sucesso" : "aviso"}>
                    {s.status === "concluido" ? "Concluido" : "Em andamento"}
                  </Selo>
                  <Selo cor="neutro">{s.pistasUsadas} pista(s)</Selo>
                </div>
                <span className="text-xs text-slate-400">
                  iniciou {new Date(s.iniciadaEm).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {logs.length === 0
                  ? <p className="text-sm text-slate-400">Sem interacoes ainda.</p>
                  : logs.map((l, idx) => <LinhaProcesso key={idx} i={l} />)}
              </div>
            </Cartao>
          ))
        )}
      </div>
    </LayoutApp>
  );
}
