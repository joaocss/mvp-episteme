// Sessao do aluno num treino (Modo Treinador). Duas acoes:
//  - 'orientar': registra a tentativa do aluno, pede UMA pista a IA (que nunca
//    entrega a resposta) e registra a pista. Tudo vira registro do PROCESSO.
//  - 'concluir': registra a resposta final + a reflexao do aluno e encerra.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { lerSessaoPermitida } from "../../../lib/sessao";
import { orientar, type DependenciasTreinador } from "../../../src/rag/treinador";
import { criarEmbeddings } from "../../../src/ia/fabricaEmbeddings";
import { criarLlm } from "../../../src/ia/fabricaLlm";
import { RepositorioPostgres } from "../../../src/rag/repositorioPostgres";
import { turmaDoAluno } from "../../../src/bd/aluno";
import {
  obterTreinoPublicadoDaTurma, obterOuCriarSessaoTreino, historicoTreino,
  registrarInteracaoTreino, incrementarPistas, concluirSessaoTreino, obterSessaoDoAluno,
} from "../../../src/bd/treinos";
import { registrarAuditoria } from "../../../src/rag/repositorioConversas";

export const runtime = "nodejs";
export const maxDuration = 30;

let dep: DependenciasTreinador | null = null;
function dependencias(): DependenciasTreinador {
  if (!dep) dep = { embeddings: criarEmbeddings(), llm: criarLlm(), repositorio: new RepositorioPostgres() };
  return dep;
}

export async function POST(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerSessaoPermitida((n) => armazem.get(n)?.value, ["aluno"]);
  if (!sessao) return NextResponse.json({ erro: "nao autenticado" }, { status: 401 });
  if (sessao.papel !== "aluno") return NextResponse.json({ erro: "acesso restrito a alunos" }, { status: 403 });

  const d = await requisicao.json().catch(() => ({}));
  const acao = String(d.acao ?? "orientar");
  const { escolaId, usuarioId: alunoId } = sessao;
  const traceId = randomUUID();

  // -------- concluir: registra resposta final + reflexao --------
  if (acao === "concluir") {
    const sessaoId = String(d.sessaoId ?? "").trim();
    const respostaFinal = String(d.respostaFinal ?? "").trim();
    const reflexao = String(d.reflexao ?? "").trim();
    if (!sessaoId || !respostaFinal) {
      return NextResponse.json({ erro: "informe a resposta final" }, { status: 400 });
    }
    const dono = await obterSessaoDoAluno(escolaId, sessaoId, alunoId);
    if (!dono) return NextResponse.json({ erro: "sessao nao encontrada" }, { status: 404 });
    await registrarInteracaoTreino(escolaId, sessaoId, "aluno", "resposta_final", respostaFinal, traceId);
    if (reflexao) await registrarInteracaoTreino(escolaId, sessaoId, "aluno", "reflexao", reflexao, traceId);
    await concluirSessaoTreino(escolaId, sessaoId, alunoId, respostaFinal, reflexao);
    await registrarAuditoria(escolaId, alunoId, "treino.concluir", "treino_sessoes", sessaoId, traceId);
    return NextResponse.json({ ok: true, concluido: true });
  }

  // -------- orientar: tentativa do aluno -> pista da IA --------
  const treinoId = String(d.treinoId ?? "").trim();
  const mensagem = String(d.mensagem ?? "").trim();
  if (!treinoId || !mensagem) {
    return NextResponse.json({ erro: "escreva sua tentativa ou duvida" }, { status: 400 });
  }
  const turma = await turmaDoAluno(escolaId, alunoId);
  if (!turma) return NextResponse.json({ erro: "voce nao esta em uma turma" }, { status: 400 });

  const treino = await obterTreinoPublicadoDaTurma(escolaId, treinoId, turma.turmaId);
  if (!treino) return NextResponse.json({ erro: "treino nao disponivel" }, { status: 404 });

  const sessaoId = await obterOuCriarSessaoTreino(escolaId, treinoId, alunoId);
  await registrarInteracaoTreino(escolaId, sessaoId, "aluno", "tentativa", mensagem, traceId);

  // Historico (tentativas + pistas) como contexto do coach.
  const historicoBruto = await historicoTreino(escolaId, sessaoId);
  const historico = historicoBruto
    .filter((h) => h.tipo === "tentativa" || h.tipo === "pista")
    .map((h) => ({ autor: h.autor, conteudo: h.conteudo }));

  const opcoesTurma = turma.temMaterial ? { turmaId: turma.turmaId, modoEstrito: turma.modoEstrito } : {};

  let resultado;
  try {
    resultado = await orientar(
      escolaId,
      { enunciado: treino.enunciado, objetivo: treino.objetivo, disciplina: treino.disciplina },
      mensagem, dependencias(), historico, turma.serie, opcoesTurma,
    );
  } catch (e) {
    console.error("[treinador]", e);
    return NextResponse.json({ erro: "falha ao gerar a pista" }, { status: 500 });
  }

  const pista = resultado.pista ?? "";
  await registrarInteracaoTreino(escolaId, sessaoId, "ia", "pista", pista, traceId);
  if (!resultado.recusado) await incrementarPistas(escolaId, sessaoId);

  return NextResponse.json({ ok: true, sessaoId, pista, recusado: resultado.recusado });
}
