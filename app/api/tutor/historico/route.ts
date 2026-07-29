import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lerToken } from "../../../../lib/sessao";
import { listarSessoesAluno } from "../../../../src/bd/aluno";

export const runtime = "nodejs";

export async function GET() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "aluno") {
    return NextResponse.json({ erro: "nao autenticado" }, { status: 401 });
  }
  const sessoes = await listarSessoesAluno(sessao.usuarioId);
  return NextResponse.json({ sessoes });
}
