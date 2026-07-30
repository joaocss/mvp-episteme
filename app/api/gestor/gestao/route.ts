import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lerToken } from "../../../../lib/sessao";
import {
  criarTurma, editarTurma, excluirTurma,
  criarUsuario, editarUsuario, excluirUsuario,
  matricularAluno, definirTurmaAluno,
  vincularProfessorTurma, desvincularProfessorTurma,
  adicionarResponsavel, editarResponsavel, excluirResponsavel, listarResponsaveis,
} from "../../../../src/bd/gestao";

export const runtime = "nodejs";

export async function GET(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const alunoId = new URL(requisicao.url).searchParams.get("alunoId") ?? "";
  if (!alunoId) return NextResponse.json({ erro: "aluno não informado" }, { status: 400 });
  const responsaveis = await listarResponsaveis(sessao.escolaId, alunoId);
  return NextResponse.json({ responsaveis });
}

export async function POST(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const d = await requisicao.json().catch(() => ({}));
  const esc = sessao.escolaId;
  try {
    switch (d.acao) {
      case "turma":
        if (!d.nome || !d.serie) return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
        await criarTurma(esc, d.nome, Number(d.anoLetivo) || new Date().getFullYear(), d.serie);
        break;

      case "editar-turma":
        if (!d.id || !d.nome || !d.serie) return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
        await editarTurma(esc, d.id, d.nome, d.serie, Number(d.anoLetivo) || new Date().getFullYear());
        break;

      case "excluir-turma":
        if (!d.id) return NextResponse.json({ erro: "turma não informada" }, { status: 400 });
        await excluirTurma(esc, d.id);
        break;

      case "professor":
      case "aluno": {
        if (!d.nome || !d.email || !d.senha) return NextResponse.json({ erro: "informe nome, email e senha" }, { status: 400 });
        const id = await criarUsuario(esc, d.acao, d.nome, d.email, d.senha, {
          dataNascimento: d.dataNascimento, disciplinas: d.disciplinas,
          enderecoFamilia: d.enderecoFamilia, estadoCivilPais: d.estadoCivilPais,
          paisMoramJuntos: d.paisMoramJuntos === undefined ? null : Boolean(d.paisMoramJuntos),
        });
        if (d.turmaId && d.acao === "professor") await vincularProfessorTurma(esc, id, d.turmaId);
        if (d.turmaId && d.acao === "aluno") await matricularAluno(esc, id, d.turmaId);
        break;
      }

      case "editar-usuario":
        if (!d.id || !d.nome || !d.email) return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
        await editarUsuario(esc, d.id, d.nome, d.email, {
          dataNascimento: d.dataNascimento, disciplinas: d.disciplinas,
          enderecoFamilia: d.enderecoFamilia, estadoCivilPais: d.estadoCivilPais,
          paisMoramJuntos: d.paisMoramJuntos === undefined ? null : Boolean(d.paisMoramJuntos),
        });
        // Aluno pode ter a turma redefinida na edicao.
        if (d.papel === "aluno") await definirTurmaAluno(esc, d.id, d.turmaId || null);
        break;

      case "excluir-usuario":
        if (!d.id) return NextResponse.json({ erro: "usuário não informado" }, { status: 400 });
        await excluirUsuario(esc, d.id);
        break;

      case "responsavel":
        if (!d.alunoId || !d.nome || !d.parentesco) return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
        await adicionarResponsavel(esc, d.alunoId, d.nome, d.parentesco, d.telefone || null, d.email || null);
        break;

      case "editar-responsavel":
        if (!d.id || !d.nome || !d.parentesco) return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
        await editarResponsavel(esc, d.id, d.nome, d.parentesco, d.telefone || null, d.email || null);
        break;

      case "excluir-responsavel":
        if (!d.id) return NextResponse.json({ erro: "responsável não informado" }, { status: 400 });
        await excluirResponsavel(esc, d.id);
        break;

      case "vinculo":
        if (!d.professorId || !d.turmaId) return NextResponse.json({ erro: "selecione professor e turma" }, { status: 400 });
        await vincularProfessorTurma(esc, d.professorId, d.turmaId);
        break;

      case "desvincular":
        if (!d.professorId || !d.turmaId) return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
        await desvincularProfessorTurma(esc, d.professorId, d.turmaId);
        break;

      default:
        return NextResponse.json({ erro: "acao invalida" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = /duplicate key|unique/i.test(String(e?.message)) ? "Email já cadastrado." : "Falha ao salvar.";
    return NextResponse.json({ erro: msg }, { status: 400 });
  }
}
