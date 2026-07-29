import { NextResponse } from "next/server";
import { responder, Dependencias } from "../../../src/rag/tutor";
import { criarEmbeddings } from "../../../src/ia/fabricaEmbeddings";
import { criarLlm } from "../../../src/ia/fabricaLlm";
import { RepositorioPostgres } from "../../../src/rag/repositorioPostgres";
import { criarClienteServidor } from "../../../lib/supabase/servidor";

// pg exige runtime Node. Next carrega .env.local automaticamente.
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

interface ContextoAluno { escolaId?: string; papel?: string; serie?: string; }

// Le escola_id, papel e serie que o hook injetou no token.
function lerClaims(token: string): ContextoAluno {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf-8"));
    const meta = payload.app_metadata ?? {};
    return { escolaId: meta.escola_id, papel: meta.papel, serie: meta.serie };
  } catch {
    return {};
  }
}

export async function POST(requisicao: Request) {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "nao autenticado" }, { status: 401 });

  const { data: { session } } = await supabase.auth.getSession();
  const ctx = lerClaims(session?.access_token ?? "");

  // Gating de 6o ano: so aluno pre-cadastrado no 6o ano da sua escola.
  if (!ctx.escolaId || ctx.papel !== "aluno" || ctx.serie !== "6o ano") {
    return NextResponse.json({ erro: "acesso restrito a alunos do 6o ano" }, { status: 403 });
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
    const resultado = await responder(ctx.escolaId, pergunta.trim(), obterDependencias());
    return NextResponse.json(resultado);
  } catch (e) {
    console.error("Erro no tutor:", e);
    return NextResponse.json({ erro: "falha ao processar" }, { status: 500 });
  }
}
