import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lerSessaoPermitida } from "../../../../lib/sessao";
import { gerarPlanoEnsino, gerarPlanoInclusivoAluno } from "../../../../src/rag/planejamento";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerSessaoPermitida((n) => armazem.get(n)?.value, ["professor"]);
  if (!sessao || sessao.papel !== "professor") {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const d = await requisicao.json().catch(() => ({}));
  const alunoId = typeof d?.alunoId === "string" && d.alunoId.trim() ? d.alunoId.trim() : null;
  try {
    // alunoId presente = plano inclusivo individual; senao = plano da turma.
    const plano = alunoId
      ? await gerarPlanoInclusivoAluno(sessao.escolaId, sessao.usuarioId, alunoId)
      : await gerarPlanoEnsino(sessao.escolaId, sessao.usuarioId);
    return NextResponse.json(plano);
  } catch (e: any) {
    console.error("[plano-ensino]", e);
    return NextResponse.json({ erro: e?.message ?? "falha ao gerar o plano" }, { status: 500 });
  }
}
