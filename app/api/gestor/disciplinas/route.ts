// Catalogo de disciplinas da escola. GET liberado a professor e gestor (para
// popular os seletores de material/tutor); criar/renomear/excluir e do gestor.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listarDisciplinas, criarDisciplina, editarDisciplina, excluirDisciplina } from "../../../../src/bd/disciplinas";
import { lerSessaoPermitida } from "../../../../lib/sessao";

export const runtime = "nodejs";

async function sessaoValida() {
  const armazem = await cookies();
  return lerSessaoPermitida((n) => armazem.get(n)?.value, ["gestor", "admin"]);
}

export async function GET() {
  const sessao = await sessaoValida();
  if (!sessao || !["professor", "gestor", "admin"].includes(sessao.papel)) {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const disciplinas = await listarDisciplinas(sessao.escolaId);
  return NextResponse.json({ disciplinas });
}

export async function POST(requisicao: Request) {
  const sessao = await sessaoValida();
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const d = await requisicao.json().catch(() => ({}));
  if (!d.nome?.trim()) return NextResponse.json({ erro: "informe o nome da disciplina" }, { status: 400 });
  const disciplina = await criarDisciplina(sessao.escolaId, d.nome);
  return NextResponse.json({ ok: true, disciplina });
}

export async function PATCH(requisicao: Request) {
  const sessao = await sessaoValida();
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const d = await requisicao.json().catch(() => ({}));
  if (!d.id || !d.nome?.trim()) return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
  await editarDisciplina(sessao.escolaId, d.id, d.nome);
  return NextResponse.json({ ok: true });
}

export async function DELETE(requisicao: Request) {
  const sessao = await sessaoValida();
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const id = new URL(requisicao.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ erro: "disciplina não informada" }, { status: 400 });
  await excluirDisciplina(sessao.escolaId, id);
  return NextResponse.json({ ok: true });
}
