import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lerToken } from "../../../../lib/sessao";
import { gerarPlanoEnsino } from "../../../../src/rag/planejamento";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  try {
    const plano = await gerarPlanoEnsino(sessao.escolaId, sessao.usuarioId);
    return NextResponse.json(plano);
  } catch (e) {
    console.error("[plano-ensino]", e);
    return NextResponse.json({ erro: "falha ao gerar o plano" }, { status: 500 });
  }
}
