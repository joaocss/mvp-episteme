import { NextResponse, type NextRequest } from "next/server";

// Rotas que exigem sessao. O RBAC por papel e validado em cada pagina/rota.
// "/paineis" e publica de proposito: e a tela de escolha de perfil ANTES do
// login (Fase 7), nao um painel pos-login.
const PROTEGIDAS = ["/dashboard", "/tutor", "/api/tutor", "/professor", "/gestor", "/provas", "/api/provas", "/treinos", "/api/treino-sessao"];

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
    "/dashboard/:path*",
    "/tutor/:path*",
    "/api/tutor/:path*",
    "/professor/:path*",
    "/gestor/:path*",
    "/provas/:path*",
    "/api/provas/:path*",
    "/treinos/:path*",
    "/api/treino-sessao/:path*",
  ],
};
