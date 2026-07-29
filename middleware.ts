import { NextResponse, type NextRequest } from "next/server";

// Rotas que exigem sessao. O RBAC por papel e validado em cada pagina/rota.
const PROTEGIDAS = ["/paineis", "/dashboard", "/tutor", "/api/tutor", "/professor", "/gestor"];

export function middleware(requisicao: NextRequest) {
  const temSessao = requisicao.cookies.has("sessao_aluno");
  const caminho = requisicao.nextUrl.pathname;
  if (!temSessao && PROTEGIDAS.some((r) => caminho.startsWith(r))) {
    const url = requisicao.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/paineis/:path*",
    "/dashboard/:path*",
    "/tutor/:path*",
    "/api/tutor/:path*",
    "/professor/:path*",
    "/gestor/:path*",
  ],
};
