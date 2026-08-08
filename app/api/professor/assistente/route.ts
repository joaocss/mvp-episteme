// Assistente de IA da equipe (professor/gestao). Responde a partir dos documentos
// cuja audiencia inclui o papel de quem pergunta ('professor' ou 'gestor') ou
// 'escola'. Auditado. Isolamento por escola vem da sessao.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { lerSessaoPermitida } from "../../../../lib/sessao";
import { responderAssistente, type DependenciasAssistente } from "../../../../src/rag/assistenteProfessor";
import { criarEmbeddings } from "../../../../src/ia/fabricaEmbeddings";
import { criarLlm } from "../../../../src/ia/fabricaLlm";
import { RepositorioPostgres } from "../../../../src/rag/repositorioPostgres";
import { registrarAuditoria } from "../../../../src/rag/repositorioConversas";

export const runtime = "nodejs";
export const maxDuration = 30;

let dep: DependenciasAssistente | null = null;
function dependencias(): DependenciasAssistente {
  if (!dep) dep = { embeddings: criarEmbeddings(), llm: criarLlm(), repositorio: new RepositorioPostgres() };
  return dep;
}

export async function POST(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerSessaoPermitida((n) => armazem.get(n)?.value, ["professor", "gestor", "admin"]);
  if (!sessao || !["professor", "gestor", "admin"].includes(sessao.papel)) {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const d = await requisicao.json().catch(() => ({}));
  const pergunta = String(d.pergunta ?? "").trim();
  if (!pergunta) return NextResponse.json({ erro: "escreva sua pergunta" }, { status: 400 });

  const papelAudiencia = sessao.papel === "professor" ? "professor" : "gestor";
  const traceId = randomUUID();
  let resultado;
  try {
    resultado = await responderAssistente(sessao.escolaId, pergunta, dependencias(), papelAudiencia);
  } catch (e) {
    console.error("[assistente]", e);
    return NextResponse.json({ erro: "falha ao processar" }, { status: 500 });
  }
  await registrarAuditoria(sessao.escolaId, sessao.usuarioId, "assistente.pergunta", "materiais_publico", null, traceId);
  return NextResponse.json({ ...resultado });
}
