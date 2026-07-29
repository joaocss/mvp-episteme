import { NextResponse } from "next/server";
import { buscarAlunoPorEmail } from "../../../src/bd/alunos";
import { criarToken } from "../../../lib/sessao";

export const runtime = "nodejs";

export async function POST(requisicao: Request) {
  const { email } = await requisicao.json().catch(() => ({ email: "" }));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ erro: "Informe o email." }, { status: 400 });
  }
  const aluno = await buscarAlunoPorEmail(email);
  if (!aluno) {
    return NextResponse.json({ erro: "Email não cadastrado como aluno do 6º ano." }, { status: 401 });
  }
  const resposta = NextResponse.json({ ok: true, nome: aluno.nome });
  resposta.cookies.set("sessao_aluno", criarToken({ alunoId: aluno.id, escolaId: aluno.escolaId }), {
    httpOnly: true, path: "/", sameSite: "lax", maxAge: 604800,
  });
  return resposta;
}
