// Registra a inscricao de Web Push do navegador do usuario logado.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lerSessaoPermitida, PAPEIS_SESSAO } from "../../../../lib/sessao";
import { salvarInscricao } from "../../../../src/bd/push";

export const runtime = "nodejs";

export async function POST(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerSessaoPermitida((n) => armazem.get(n)?.value, PAPEIS_SESSAO);
  if (!sessao) return NextResponse.json({ erro: "nao autenticado" }, { status: 401 });

  const d = await requisicao.json().catch(() => ({}));
  const endpoint = d?.endpoint;
  const p256dh = d?.keys?.p256dh;
  const auth = d?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ erro: "inscricao invalida" }, { status: 400 });
  }
  await salvarInscricao(sessao.escolaId, sessao.usuarioId, { endpoint, p256dh, auth });
  return NextResponse.json({ ok: true });
}
