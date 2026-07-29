import { NextResponse, type NextRequest } from "next/server";

export function middleware(requisicao: NextRequest) {
  const temSessao = requisicao.cookies.has("sessao_aluno");
  const caminho = requisicao.nextUrl.pathname;
  if (!temSessao && (caminho.startsWith("/tutor") || caminho.startsWith("/api/tutor") || caminho.startsWith("/professor"))) {
    const url = requisicao.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/tutor/:path*", "/api/tutor/:path*", "/professor/:path*"] };
