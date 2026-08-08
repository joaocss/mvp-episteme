import { NextResponse } from "next/server";
import { criarAluno } from "../../../src/bd/alunos";
import { criarToken, nomeCookieSessao } from "../../../lib/sessao";

export const runtime = "nodejs";

export async function POST(requisicao: Request) {
  const { email, nome, senha } = await requisicao.json().catch(() => ({ email: "", nome: "", senha: "" }));
  if (!email || !nome || !senha) {
    return NextResponse.json({ erro: "Informe nome, email e senha." }, { status: 400 });
  }
  if (String(senha).length < 6) {
    return NextResponse.json({ erro: "A senha deve ter ao menos 6 caracteres." }, { status: 400 });
  }
  const aluno = await criarAluno(String(email), String(nome), String(senha));
  const resposta = NextResponse.json({ ok: true, papel: "aluno", nome: aluno.nome });
  resposta.cookies.set(
    nomeCookieSessao("aluno"),
    criarToken({ usuarioId: aluno.id, escolaId: aluno.escolaId, papel: "aluno" }),
    { httpOnly: true, path: "/", sameSite: "lax", maxAge: 604800 },
  );
  return resposta;
}
