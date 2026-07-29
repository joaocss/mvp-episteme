import { NextResponse } from "next/server";
import { criarClienteServidor } from "../../../lib/supabase/servidor";

export async function POST(requisicao: Request) {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${new URL(requisicao.url).origin}/login`, { status: 303 });
}
