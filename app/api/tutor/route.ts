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
  buscarHistoricoRecente, obterDisciplinaSessao,
} from "../../../src/rag/repositorioConversas";
import { turmaDoAluno } from "../../../src/bd/aluno";

export const runtime = "nodejs";
export const maxDuration = 30;

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

  let corpo: { pergunta?: unknown; sessaoId?: unknown; imagemBase64?: unknown; disciplina?: unknown };
  try {
    corpo = await requisicao.json();
  } catch {
    return NextResponse.json({ erro: "corpo invalido" }, { status: 400 });
  }
  const pergunta = corpo.pergunta;
  if (typeof pergunta !== "string" || !pergunta.trim()) {
    return NextResponse.json({ erro: "pergunta obrigatoria" }, { status: 400 });
  }
  // Imagem opcional (Fase 6: tutor multimodal). Limite generoso de ~6MB em base64
  // (~4.5MB de imagem) para não estourar custo/latencia da chamada de visao.
  let imagemBase64: string | undefined;
  if (typeof corpo.imagemBase64 === "string" && corpo.imagemBase64.trim()) {
    if (!/^data:image\/(png|jpe?g|webp);base64,/.test(corpo.imagemBase64)) {
      return NextResponse.json({ erro: "formato de imagem inválido" }, { status: 400 });
    }
    if (corpo.imagemBase64.length > 6_000_000) {
      return NextResponse.json({ erro: "imagem muito grande (máx. ~4,5MB)" }, { status: 400 });
    }
    imagemBase64 = corpo.imagemBase64;
  }

  const traceId = randomUUID();
  const { escolaId, usuarioId: alunoId } = sessao;

  // Turma do aluno: define a serie (escopo do material) e, quando a turma tem
  // material proprio, restringe a busca a ela (conteudo estritamente da turma).
  // modoEstrito bloqueia o fallback para BNCC/conhecimento geral.
  const turma = await turmaDoAluno(escolaId, alunoId);
  const serie = turma?.serie ?? "6o ano";
  // Modo estrito so vale quando a turma ja tem material proprio: sem material,
  // cai no comportamento legado (busca por disciplina/serie) para nao bloquear
  // tudo enquanto o professor ainda nao subiu conteudo da turma.
  const opcoesTurma = turma?.temMaterial
    ? { turmaId: turma.turmaId, modoEstrito: turma.modoEstrito }
    : {};
  const disciplinaEscolhida = typeof corpo.disciplina === "string" && corpo.disciplina.trim()
    ? corpo.disciplina.trim() : "matematica";

  // Sessao de conversa (o chat reusa o id retornado).
  let sessaoId = typeof corpo.sessaoId === "string" && UUID.test(corpo.sessaoId) ? corpo.sessaoId : "";
  let interacaoAluno: string | null = null;
  let historico: { autor: "aluno" | "ia"; conteudo: string }[] = [];
  let disciplina = disciplinaEscolhida;
  try {
    if (!sessaoId) {
      sessaoId = await criarSessao(escolaId, alunoId, disciplinaEscolhida);
    } else {
      // Memoria de contexto (Fase 4): so traz turnos dentro do TTL de ~7 dias.
      [historico, disciplina] = await Promise.all([
        buscarHistoricoRecente(escolaId, sessaoId),
        obterDisciplinaSessao(escolaId, sessaoId),
      ]);
    }
    interacaoAluno = await registrarInteracao({
      escolaId, sessaoId, autor: "aluno", conteudo: pergunta.trim(), traceId, anexoImagem: imagemBase64 ?? null,
    });
    await registrarAuditoria(escolaId, alunoId, "pergunta_tutor", "sessao", sessaoId, traceId);
  } catch (e) {
    console.error("[persist pergunta]", e);
  }

  // Pipeline de RAG.
  const inicio = Date.now();
  let resultado;
  try {
    resultado = await responder(escolaId, pergunta.trim(), obterDependencias(), historico, imagemBase64, disciplina, serie, opcoesTurma);
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

  return NextResponse.json({ ...resultado, sessaoId, traceId, disciplina, serie });
}
