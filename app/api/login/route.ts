import { NextResponse } from "next/server";
import { buscarUsuarioPorEmail } from "../../../src/bd/alunos";
import { criarToken } from "../../../lib/sessao";

export const runtime = "nodejs";

export async function POST(requisicao: Request) {
  const { email } = await requisicao.json().catch(() => ({ email: "" }));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ erro: "Informe o email." }, { status: 400 });
  }
  const usuario = await buscarUsuarioPorEmail(email);
  if (!usuario) {
    return NextResponse.json({ erro: "Email não cadastrado." }, { status: 401 });
  }
  const resposta = NextResponse.json({ ok: true, papel: usuario.papel, nome: usuario.nome });
  resposta.cookies.set(
    "sessao_aluno",
    criarToken({ usuarioId: usuario.id, escolaId: usuario.escolaId, papel: usuario.papel }),
    { httpOnly: true, path: "/", sameSite: "lax", maxAge: 604800 },
  );
  return resposta;
}
