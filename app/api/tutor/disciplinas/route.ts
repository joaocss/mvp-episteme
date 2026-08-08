import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lerSessaoPermitida } from "../../../../lib/sessao";
import { serieDoAluno, disciplinasDisponiveis } from "../../../../src/bd/aluno";

export const runtime = "nodejs";

export async function GET() {
  const armazem = await cookies();
  const sessao = lerSessaoPermitida((n) => armazem.get(n)?.value, ["aluno"]);
  if (!sessao || sessao.papel !== "aluno") return NextResponse.json({ erro: "acesso restrito a alunos" }, { status: 403 });

  const serie = await serieDoAluno(sessao.escolaId, sessao.usuarioId);
  const disciplinas = await disciplinasDisponiveis(sessao.escolaId, serie);
  return NextResponse.json({ serie, disciplinas: disciplinas.length ? disciplinas : ["matematica"] });
}
