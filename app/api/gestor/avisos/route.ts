// Avisos/comunicados — o gestor cria e escolhe a audiencia; ao criar, dispara
// push + e-mail para os destinatarios. Listagem/exclusao tambem do gestor.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { lerSessaoPermitida } from "../../../../lib/sessao";
import { criarAviso, listarAvisosDaEscola, excluirAviso, type PapelAudiencia } from "../../../../src/bd/avisos";
import { notificarAviso } from "../../../../src/notificacoes/avisos";
import { registrarAuditoria } from "../../../../src/rag/repositorioConversas";

export const runtime = "nodejs";

async function sessaoGestor() {
  const armazem = await cookies();
  const s = lerSessaoPermitida((n) => armazem.get(n)?.value, ["gestor", "admin"]);
  return s && (s.papel === "gestor" || s.papel === "admin") ? s : null;
}

const PAPEIS_VALIDOS: PapelAudiencia[] = ["aluno", "professor", "gestor"];

export async function GET() {
  const s = await sessaoGestor();
  if (!s) return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  return NextResponse.json({ avisos: await listarAvisosDaEscola(s.escolaId) });
}

export async function POST(requisicao: Request) {
  const s = await sessaoGestor();
  if (!s) return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const d = await requisicao.json().catch(() => ({}));
  const titulo = String(d.titulo ?? "").trim();
  const corpo = String(d.corpo ?? "").trim();
  const audiencia = (Array.isArray(d.audiencia) ? d.audiencia : []).filter((p: string) => PAPEIS_VALIDOS.includes(p as PapelAudiencia)) as PapelAudiencia[];
  const turmaId = typeof d.turmaId === "string" && d.turmaId.trim() ? d.turmaId.trim() : null;
  if (!titulo || !corpo || audiencia.length === 0) {
    return NextResponse.json({ erro: "informe titulo, mensagem e ao menos uma audiencia" }, { status: 400 });
  }
  const id = await criarAviso(s.escolaId, s.usuarioId, titulo, corpo, audiencia, turmaId);
  await registrarAuditoria(s.escolaId, s.usuarioId, "aviso.criar", "avisos", id, randomUUID());
  const entregas = await notificarAviso(s.escolaId, { id, titulo, corpo, audiencia, turmaId });
  return NextResponse.json({ ok: true, id, entregas });
}

export async function DELETE(requisicao: Request) {
  const s = await sessaoGestor();
  if (!s) return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const id = new URL(requisicao.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ erro: "aviso nao informado" }, { status: 400 });
  await excluirAviso(s.escolaId, id);
  return NextResponse.json({ ok: true });
}
