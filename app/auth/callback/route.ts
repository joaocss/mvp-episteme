import { NextResponse } from "next/server";
import { criarClienteServidor } from "../../../lib/supabase/servidor";

export async function GET(requisicao: Request) {
  const { searchParams, origin } = new URL(requisicao.url);
  const code = searchParams.get("code");
  const proximo = searchParams.get("next") ?? "/tutor";

  if (code) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${proximo}`);
  }
  return NextResponse.redirect(`${origin}/login?erro=autenticacao`);
}
