import { NextResponse } from "next/server";
import { NOMES_COOKIE_SESSAO } from "../../../lib/sessao";

export async function POST(requisicao: Request) {
  const resposta = NextResponse.redirect(`${new URL(requisicao.url).origin}/login`, { status: 303 });
  // Limpa a sessao de TODOS os papeis (o navegador pode ter mais de uma).
  for (const nome of NOMES_COOKIE_SESSAO) resposta.cookies.set(nome, "", { path: "/", maxAge: 0 });
  return resposta;
}
