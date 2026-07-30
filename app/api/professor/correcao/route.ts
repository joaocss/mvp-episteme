import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lerToken } from "../../../../lib/sessao";
import { corrigirManualmente } from "../../../../src/bd/provas";

export const runtime = "nodejs";

export async function POST(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const d = await requisicao.json().catch(() => ({}));
  if (!d.questaoId || !d.alunoId || d.notaManual === undefined) {
    return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
  }
  const nota = Number(d.notaManual);
  if (Number.isNaN(nota) || nota < 0) return NextResponse.json({ erro: "nota inválida" }, { status: 400 });
  await corrigirManualmente(sessao.escolaId, sessao.usuarioId, d.questaoId, d.alunoId, nota, d.feedbackProfessor || null);
  return NextResponse.json({ ok: true });
}
