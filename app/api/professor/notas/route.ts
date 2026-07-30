import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lerToken } from "../../../../lib/sessao";
import { lancarNota, excluirNota, registrarFalta, excluirFalta, notasDaTurma, faltasDaTurma } from "../../../../src/bd/notas";

export const runtime = "nodejs";

export async function GET(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const turmaId = new URL(requisicao.url).searchParams.get("turmaId") ?? "";
  if (!turmaId) return NextResponse.json({ erro: "turma não informada" }, { status: 400 });
  const [notas, faltas] = await Promise.all([
    notasDaTurma(sessao.escolaId, turmaId),
    faltasDaTurma(sessao.escolaId, turmaId),
  ]);
  return NextResponse.json({ notas, faltas });
}

export async function POST(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const d = await requisicao.json().catch(() => ({}));
  const esc = sessao.escolaId;
  const professorId = sessao.usuarioId;
  try {
    switch (d.acao) {
      case "lancar-nota": {
        if (!d.alunoId || !d.turmaId || !d.descricao || d.valor === undefined || !d.notaMaxima) {
          return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
        }
        const valor = Number(d.valor);
        const notaMaxima = Number(d.notaMaxima);
        if (Number.isNaN(valor) || Number.isNaN(notaMaxima) || valor < 0 || valor > notaMaxima) {
          return NextResponse.json({ erro: "nota inválida para a escala configurada" }, { status: 400 });
        }
        await lancarNota(esc, professorId, d.alunoId, d.turmaId, d.descricao, valor, notaMaxima);
        break;
      }
      case "excluir-nota":
        if (!d.id) return NextResponse.json({ erro: "nota não informada" }, { status: 400 });
        await excluirNota(esc, professorId, d.id);
        break;
      case "lancar-falta":
        if (!d.alunoId || !d.turmaId || !d.data) return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
        await registrarFalta(esc, professorId, d.alunoId, d.turmaId, d.data,
          d.situacao === "justificada" ? "justificada" : "nao_justificada", d.motivo || null);
        break;
      case "excluir-falta":
        if (!d.id) return NextResponse.json({ erro: "falta não informada" }, { status: 400 });
        await excluirFalta(esc, professorId, d.id);
        break;
      default:
        return NextResponse.json({ erro: "ação inválida" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "falha ao salvar" }, { status: 400 });
  }
}
