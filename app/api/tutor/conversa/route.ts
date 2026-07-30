import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lerToken } from "../../../../lib/sessao";
import { conversaDoAluno } from "../../../../src/bd/aluno";

export const runtime = "nodejs";

export async function GET(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "aluno") {
    return NextResponse.json({ erro: "nao autenticado" }, { status: 401 });
  }
  const sessaoId = new URL(requisicao.url).searchParams.get("sessao") ?? "";
  const conversa = await conversaDoAluno(sessao.usuarioId, sessaoId);
  if (!conversa) return NextResponse.json({ erro: "sessao nao encontrada" }, { status: 404 });
  return NextResponse.json(conversa);
}
