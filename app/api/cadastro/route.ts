import { NextResponse } from "next/server";
import { criarAluno } from "../../../src/bd/alunos";
import { criarToken } from "../../../lib/sessao";

export const runtime = "nodejs";

export async function POST(requisicao: Request) {
  const { email, nome } = await requisicao.json().catch(() => ({ email: "", nome: "" }));
  if (!email || !nome) {
    return NextResponse.json({ erro: "Informe nome e email." }, { status: 400 });
  }
  const aluno = await criarAluno(String(email), String(nome));
  const resposta = NextResponse.json({ ok: true, nome: aluno.nome });
  resposta.cookies.set("sessao_aluno", criarToken({ alunoId: aluno.id, escolaId: aluno.escolaId }), {
    httpOnly: true, path: "/", sameSite: "lax", maxAge: 604800,
  });
  return resposta;
}
