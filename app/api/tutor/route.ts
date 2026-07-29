import { NextRequest, NextResponse } from "next/server";
import { responder, Dependencias } from "../../../src/rag/tutor";
import { criarEmbeddings } from "../../../src/ia/fabricaEmbeddings";
import { criarLlm } from "../../../src/ia/fabricaLlm";
import { RepositorioPostgres } from "../../../src/rag/repositorioPostgres";

// pg exige runtime Node (nao edge). Next carrega .env.local automaticamente.
export const runtime = "nodejs";

// Escola de demonstracao (seed). Trocar pela escola do usuario autenticado
// quando o login (Supabase Auth + gating de 6o ano) estiver ligado.
const ESCOLA_DEMO = "00000000-0000-0000-0000-000000000001";

// Reusa as dependencias entre requisicoes (evita abrir varios pools de conexao).
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

export async function POST(requisicao: NextRequest) {
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
    const resultado = await responder(ESCOLA_DEMO, pergunta.trim(), obterDependencias());
    return NextResponse.json(resultado);
  } catch (e) {
    console.error("Erro no tutor:", e);
    return NextResponse.json({ erro: "falha ao processar" }, { status: 500 });
  }
}
