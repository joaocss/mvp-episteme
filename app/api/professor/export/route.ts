import { cookies } from "next/headers";
import { lerToken } from "../../../../lib/sessao";
import { exportarInteracoesCsv } from "../../../../src/bd/professor";

export const runtime = "nodejs";

export async function GET() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") {
    return new Response("acesso restrito", { status: 403 });
  }
  const csv = await exportarInteracoesCsv(sessao.usuarioId);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="conversas.csv"',
    },
  });
}
