import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lerToken } from "../../../../lib/sessao";
import {
  criarTurma, criarUsuario, matricularAluno, vincularProfessorTurma,
} from "../../../../src/bd/gestao";

export const runtime = "nodejs";

export async function POST(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const d = await requisicao.json().catch(() => ({}));
  const esc = sessao.escolaId;
  try {
    if (d.acao === "turma") {
      if (!d.nome || !d.serie) return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
      await criarTurma(esc, d.nome, Number(d.anoLetivo) || new Date().getFullYear(), d.serie);
    } else if (d.acao === "professor" || d.acao === "aluno") {
      if (!d.nome || !d.email || !d.senha) return NextResponse.json({ erro: "informe nome, email e senha" }, { status: 400 });
      const id = await criarUsuario(esc, d.acao, d.nome, d.email, d.senha);
      if (d.turmaId && d.acao === "professor") await vincularProfessorTurma(esc, id, d.turmaId);
      if (d.turmaId && d.acao === "aluno") await matricularAluno(esc, id, d.turmaId);
    } else if (d.acao === "vinculo") {
      if (!d.professorId || !d.turmaId) return NextResponse.json({ erro: "selecione professor e turma" }, { status: 400 });
      await vincularProfessorTurma(esc, d.professorId, d.turmaId);
    } else {
      return NextResponse.json({ erro: "acao invalida" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = /duplicate key|unique/i.test(String(e?.message)) ? "Email já cadastrado." : "Falha ao salvar.";
    return NextResponse.json({ erro: msg }, { status: 400 });
  }
}
