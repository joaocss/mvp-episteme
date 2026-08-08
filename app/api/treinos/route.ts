// Treinos do Modo Treinador — CRUD do professor. Criar, publicar/arquivar e
// excluir. Isolamento por escola vem da sessao; as escritas filtram por
// professor_id (so o dono mexe no proprio treino). Auditado.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { lerSessaoPermitida } from "../../../lib/sessao";
import {
  criarTreino, listarTreinosDoProfessor, definirStatusTreino, excluirTreino,
  turmasDisciplinasDoProfessor, obterTreinoDoProfessor, type StatusTreino,
} from "../../../src/bd/treinos";
import { registrarAuditoria } from "../../../src/rag/repositorioConversas";
import { notificarTurma } from "../../../src/notificacoes/push";

export const runtime = "nodejs";

const PAPEIS_OK = ["professor", "admin"];

async function sessaoProfessor() {
  const armazem = await cookies();
  const s = lerSessaoPermitida((n) => armazem.get(n)?.value, PAPEIS_OK);
  return s && PAPEIS_OK.includes(s.papel) ? s : null;
}

export async function GET() {
  const s = await sessaoProfessor();
  if (!s) return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const [treinos, turmas] = await Promise.all([
    listarTreinosDoProfessor(s.escolaId, s.usuarioId),
    turmasDisciplinasDoProfessor(s.escolaId, s.usuarioId),
  ]);
  return NextResponse.json({ treinos, turmas });
}

export async function POST(requisicao: Request) {
  const s = await sessaoProfessor();
  if (!s) return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const d = await requisicao.json().catch(() => ({}));
  const titulo = String(d.titulo ?? "").trim();
  const enunciado = String(d.enunciado ?? "").trim();
  const turmaId = String(d.turmaId ?? "").trim();
  const disciplina = String(d.disciplina ?? "").trim();
  if (!titulo || !enunciado || !turmaId || !disciplina) {
    return NextResponse.json({ erro: "informe titulo, enunciado, turma e disciplina" }, { status: 400 });
  }
  // Garante que a turma/disciplina e do professor (evita treino em turma alheia).
  const turmas = await turmasDisciplinasDoProfessor(s.escolaId, s.usuarioId);
  if (!turmas.some((t) => t.turmaId === turmaId && t.disciplina === disciplina)) {
    return NextResponse.json({ erro: "turma/disciplina invalida para voce" }, { status: 400 });
  }
  const id = await criarTreino(s.escolaId, {
    turmaId, professorId: s.usuarioId, disciplina, titulo, enunciado,
    objetivo: String(d.objetivo ?? "").trim() || null, publicar: Boolean(d.publicar),
  });
  await registrarAuditoria(s.escolaId, s.usuarioId, "treino.criar", "treinos", id, randomUUID());
  if (d.publicar) {
    await notificarTurma(s.escolaId, turmaId, {
      titulo: "Novo treino disponivel", corpo: titulo, url: "/treinos", tag: `treino-${id}`,
    });
  }
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(requisicao: Request) {
  const s = await sessaoProfessor();
  if (!s) return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const d = await requisicao.json().catch(() => ({}));
  const treinoId = String(d.treinoId ?? "").trim();
  const status = String(d.status ?? "").trim() as StatusTreino;
  if (!treinoId || !["rascunho", "publicado", "arquivado"].includes(status)) {
    return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
  }
  await definirStatusTreino(s.escolaId, s.usuarioId, treinoId, status);
  await registrarAuditoria(s.escolaId, s.usuarioId, `treino.${status}`, "treinos", treinoId, randomUUID());
  if (status === "publicado") {
    const treino = await obterTreinoDoProfessor(s.escolaId, s.usuarioId, treinoId);
    if (treino) {
      await notificarTurma(s.escolaId, treino.turmaId, {
        titulo: "Novo treino disponivel", corpo: treino.titulo, url: "/treinos", tag: `treino-${treinoId}`,
      });
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(requisicao: Request) {
  const s = await sessaoProfessor();
  if (!s) return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const treinoId = new URL(requisicao.url).searchParams.get("id") ?? "";
  if (!treinoId) return NextResponse.json({ erro: "treino nao informado" }, { status: 400 });
  await excluirTreino(s.escolaId, s.usuarioId, treinoId);
  await registrarAuditoria(s.escolaId, s.usuarioId, "treino.excluir", "treinos", treinoId, randomUUID());
  return NextResponse.json({ ok: true });
}
