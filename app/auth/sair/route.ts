import { NextResponse } from "next/server";

export async function POST(requisicao: Request) {
  const resposta = NextResponse.redirect(`${new URL(requisicao.url).origin}/login`, { status: 303 });
  resposta.cookies.set("sessao_aluno", "", { path: "/", maxAge: 0 });
  return resposta;
}
