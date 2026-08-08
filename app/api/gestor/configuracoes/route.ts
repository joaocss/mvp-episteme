import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lerSessaoPermitida } from "../../../../lib/sessao";
import { salvarConfigEscola } from "../../../../src/bd/configEscola";

export const runtime = "nodejs";

export async function POST(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerSessaoPermitida((n) => armazem.get(n)?.value, ["gestor", "admin"]);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const d = await requisicao.json().catch(() => ({}));
  const notaMaxima = Number(d.notaMaxima);
  const notaMinimaAprovacao = Number(d.notaMinimaAprovacao);
  if (!notaMaxima || notaMaxima <= 0 || notaMinimaAprovacao < 0 || notaMinimaAprovacao > notaMaxima) {
    return NextResponse.json({ erro: "escala de nota inválida" }, { status: 400 });
  }
  await salvarConfigEscola(sessao.escolaId, d.logoUrl || null, notaMaxima, notaMinimaAprovacao, d.nome);
  return NextResponse.json({ ok: true });
}
