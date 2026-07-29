import { NextResponse } from "next/server";
import { buscarUsuarioPorEmail } from "../../../src/bd/alunos";
import { verificarSenha } from "../../../lib/senha";
import { criarToken } from "../../../lib/sessao";

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
    "sessao_aluno",
    criarToken({ usuarioId: usuario.id, escolaId: usuario.escolaId, papel: usuario.papel }),
    { httpOnly: true, path: "/", sameSite: "lax", maxAge: 604800 },
  );
  return resposta;
}
