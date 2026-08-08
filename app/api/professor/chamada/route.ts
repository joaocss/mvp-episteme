// Chamada/frequencia do professor. GET carrega o roster + a chamada existente
// da turma na data; POST salva. So o professor que leciona na turma (ou o
// gestor) acessa. O gatilho de aviso de falta ao responsavel (Frente 5) sera
// ligado aqui no POST (sobre os ausentes retornados).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { lerSessaoPermitida } from "../../../../lib/sessao";
import { pool } from "../../../../src/bd/pool";
import { alunosDaTurma, obterChamada, salvarChamada, type ItemChamada } from "../../../../src/bd/frequencia";
import { registrarAuditoria } from "../../../../src/rag/repositorioConversas";
import { notificarFaltas } from "../../../../src/notificacoes/faltas";

export const runtime = "nodejs";

async function sessaoEquipe() {
  const armazem = await cookies();
  const s = lerSessaoPermitida((n) => armazem.get(n)?.value, ["professor", "gestor", "admin"]);
  return s && ["professor", "gestor", "admin"].includes(s.papel) ? s : null;
}

// Professor precisa lecionar na turma (gestor/admin podem qualquer uma da escola).
async function podeChamada(escolaId: string, papel: string, usuarioId: string, turmaId: string): Promise<boolean> {
  if (papel === "gestor" || papel === "admin") {
    const { rows } = await pool.query(`select 1 from turmas where id = $2 and escola_id = $1 limit 1`, [escolaId, turmaId]);
    return rows.length > 0;
  }
  const { rows } = await pool.query(
    `select 1 from professores_turmas where escola_id = $1 and professor_id = $2 and turma_id = $3 limit 1`,
    [escolaId, usuarioId, turmaId],
  );
  return rows.length > 0;
}

export async function GET(requisicao: Request) {
  const s = await sessaoEquipe();
  if (!s) return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const url = new URL(requisicao.url);
  const turmaId = url.searchParams.get("turmaId") ?? "";
  const data = url.searchParams.get("data") ?? "";
  if (!turmaId || !data) return NextResponse.json({ erro: "informe turma e data" }, { status: 400 });
  if (!(await podeChamada(s.escolaId, s.papel, s.usuarioId, turmaId))) {
    return NextResponse.json({ erro: "voce nao leciona nesta turma" }, { status: 403 });
  }
  const [roster, existente] = await Promise.all([
    alunosDaTurma(s.escolaId, turmaId),
    obterChamada(s.escolaId, turmaId, data),
  ]);
  return NextResponse.json({ roster, existente });
}

export async function POST(requisicao: Request) {
  const s = await sessaoEquipe();
  if (!s) return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const d = await requisicao.json().catch(() => ({}));
  const turmaId = String(d.turmaId ?? "");
  const data = String(d.data ?? "");
  const itens = Array.isArray(d.itens) ? (d.itens as ItemChamada[]) : [];
  if (!turmaId || !data || itens.length === 0) {
    return NextResponse.json({ erro: "dados da chamada incompletos" }, { status: 400 });
  }
  if (!(await podeChamada(s.escolaId, s.papel, s.usuarioId, turmaId))) {
    return NextResponse.json({ erro: "voce nao leciona nesta turma" }, { status: 403 });
  }
  const traceId = randomUUID();
  const ausentes = await salvarChamada(s.escolaId, turmaId, s.usuarioId, data, itens);
  await registrarAuditoria(s.escolaId, s.usuarioId, "chamada.salvar", "presencas", null, traceId);
  // Frente 5: avisa responsavel + aluno das ausencias (email + push). Best-effort.
  const avisos = await notificarFaltas(s.escolaId, turmaId, data, ausentes.map((a) => a.alunoId));
  return NextResponse.json({ ok: true, ausentes: ausentes.length, avisos });
}
