import { NextResponse } from "next/server";
import { buscarUsuarioPorEmail } from "../../../src/bd/alunos";
import { verificarSenha } from "../../../lib/senha";
import { criarToken, nomeCookieSessao } from "../../../lib/sessao";

export const runtime = "nodejs";

export async function POST(requisicao: Request) {
  const { email, senha } = await requisicao.json().catch(() => ({ email: "", senha: "" }));
  if (!email || !senha) {
    return NextResponse.json({ erro: "Informe email e senha." }, { status: 400 });
  }
  const usuario = await buscarUsuarioPorEmail(String(email));
  if (!usuario || !verificarSenha(String(senha), usuario.senhaHash)) {
    return NextResponse.json({ erro: "Email ou senha inválidos." }, { status: 401 });
  }
  const resposta = NextResponse.json({ ok: true, papel: usuario.papel, nome: usuario.nome });
  resposta.cookies.set(
    nomeCookieSessao(usuario.papel),
    criarToken({ usuarioId: usuario.id, escolaId: usuario.escolaId, papel: usuario.papel }),
    {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      // secure em producao: o cookie de sessao so trafega por HTTPS. Em dev
      // (http://localhost) fica desligado para o login funcionar localmente.
      secure: process.env.NODE_ENV === "production",
      maxAge: 604800,
    },
  );
  return resposta;
}
