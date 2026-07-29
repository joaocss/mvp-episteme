import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(requisicao: NextRequest) {
  let resposta = NextResponse.next({ request: requisicao });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return requisicao.cookies.getAll();
        },
        setAll(cookiesParaDefinir) {
          cookiesParaDefinir.forEach(({ name, value }) => requisicao.cookies.set(name, value));
          resposta = NextResponse.next({ request: requisicao });
          cookiesParaDefinir.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const caminho = requisicao.nextUrl.pathname;

  if (!user && (caminho.startsWith("/tutor") || caminho.startsWith("/api/tutor"))) {
    const url = requisicao.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return resposta;
}

export const config = {
  matcher: ["/tutor/:path*", "/api/tutor/:path*"],
};
