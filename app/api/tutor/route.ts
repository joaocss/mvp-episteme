import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { responder, Dependencias } from "../../../src/rag/tutor";
import { criarEmbeddings } from "../../../src/ia/fabricaEmbeddings";
import { criarLlm } from "../../../src/ia/fabricaLlm";
import { RepositorioPostgres } from "../../../src/rag/repositorioPostgres";
import { lerToken } from "../../../lib/sessao";

export const runtime = "nodejs";

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
  if (!sessao) {
    return NextResponse.json({ erro: "nao autenticado" }, { status: 401 });
  }

  let corpo: { pergunta?: unknown };
  try {
    corpo = await requisicao.json();
  } catch {
    return NextResponse.json({ erro: "corpo invalido" }, { status: 400 });
  }
  const pergunta = corpo.pergunta;
  if (typeof pergunta !== "string" || !pergunta.trim()) {
    return NextResponse.json({ erro: "pergunta obrigatoria" }, { status: 400 });
  }

  try {
    const resultado = await responder(sessao.escolaId, pergunta.trim(), obterDependencias());
    return NextResponse.json(resultado);
  } catch (e) {
    console.error("Erro no tutor:", e);
    return NextResponse.json({ erro: "falha ao processar" }, { status: 500 });
  }
}
