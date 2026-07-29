import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { responder, Dependencias } from "../../../src/rag/tutor";
import { criarEmbeddings } from "../../../src/ia/fabricaEmbeddings";
import { criarLlm } from "../../../src/ia/fabricaLlm";
import { RepositorioPostgres } from "../../../src/rag/repositorioPostgres";
import { lerToken } from "../../../lib/sessao";
import {
  criarSessao, registrarInteracao, registrarFontes, registrarGuardrails, registrarAuditoria,
} from "../../../src/rag/repositorioConversas";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let dependencias: Dependencias | null = null;
function obterDependencias(): Dependencias {
  if (!dependencias) {
    dependencias = {
      embeddings: criarEmbeddings(),
      llm: criarLlm(),
      repositorio: new RepositorioPostgres(),
    };
  }
  return dependencias;
}

export async function POST(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao) return NextResponse.json({ erro: "nao autenticado" }, { status: 401 });
  if (sessao.papel !== "aluno") return NextResponse.json({ erro: "acesso restrito a alunos" }, { status: 403 });

  let corpo: { pergunta?: unknown; sessaoId?: unknown };
  try {
    corpo = await requisicao.json();
  } catch {
    return NextResponse.json({ erro: "corpo invalido" }, { status: 400 });
  }
  const pergunta = corpo.pergunta;
  if (typeof pergunta !== "string" || !pergunta.trim()) {
    return NextResponse.json({ erro: "pergunta obrigatoria" }, { status: 400 });
  }

  const traceId = randomUUID();
  const { escolaId, usuarioId: alunoId } = sessao;

  // Sessao de conversa (o chat reusa o id retornado).
  let sessaoId = typeof corpo.sessaoId === "string" && UUID.test(corpo.sessaoId) ? corpo.sessaoId : "";
  let interacaoAluno: string | null = null;
  try {
    if (!sessaoId) sessaoId = await criarSessao(escolaId, alunoId);
    interacaoAluno = await registrarInteracao({
      escolaId, sessaoId, autor: "aluno", conteudo: pergunta.trim(), traceId,
    });
    await registrarAuditoria(escolaId, alunoId, "pergunta_tutor", "sessao", sessaoId, traceId);
  } catch (e) {
    console.error("[persist pergunta]", e);
  }

  // Pipeline de RAG.
  const inicio = Date.now();
  let resultado;
  try {
    resultado = await responder(escolaId, pergunta.trim(), obterDependencias());
  } catch (e) {
    console.error("[tutor]", e);
    return NextResponse.json({ erro: "falha ao processar" }, { status: 500 });
  }
  const latenciaMs = Date.now() - inicio;

  // Persistencia da resposta e da telemetria (best-effort).
  try {
    await registrarGuardrails(escolaId, interacaoAluno, resultado.eventos, traceId);
    const conteudoIa = resultado.recusado
      ? (resultado.motivo ?? "recusado")
      : (resultado.resposta ?? "");
    const interacaoIa = await registrarInteracao({
      escolaId, sessaoId, autor: "ia", conteudo: conteudoIa,
      modelo: resultado.telemetria.modelo, tokensEntrada: resultado.telemetria.tokensEntrada,
      tokensSaida: resultado.telemetria.tokensSaida, latenciaMs, competenciaBncc: resultado.competenciaBncc, traceId,
    });
    if (!resultado.recusado && resultado.fontes.length) {
      await registrarFontes(escolaId, interacaoIa, resultado.fontes);
    }
  } catch (e) {
    console.error("[persist resposta]", e);
  }

  return NextResponse.json({ ...resultado, sessaoId, traceId });
}
