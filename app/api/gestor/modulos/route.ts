// Modulos opcionais habilitados por escola. Listagem e toggle sao do gestor.
// O catalogo vive no codigo (src/modulos/registro.ts); aqui so persiste o
// estado ligado/desligado por escola. Auditado.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { lerSessaoPermitida } from "../../../../lib/sessao";
import { listarEstadoModulos, definirModulo } from "../../../../src/bd/modulos";
import { registrarAuditoria } from "../../../../src/rag/repositorioConversas";

export const runtime = "nodejs";

async function sessaoGestor() {
  const armazem = await cookies();
  const sessao = lerSessaoPermitida((n) => armazem.get(n)?.value, ["gestor", "admin"]);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) return null;
  return sessao;
}

export async function GET() {
  const sessao = await sessaoGestor();
  if (!sessao) return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const modulos = await listarEstadoModulos(sessao.escolaId);
  return NextResponse.json({ modulos });
}

export async function POST(requisicao: Request) {
  const sessao = await sessaoGestor();
  if (!sessao) return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const d = await requisicao.json().catch(() => ({}));
  if (!d.moduloId || typeof d.habilitado !== "boolean") {
    return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
  }
  await definirModulo(sessao.escolaId, d.moduloId, d.habilitado);
  // auditoria.entidade_id e UUID; o modulo e um slug de texto, entao vai no
  // 'acao' e entidade_id fica null.
  await registrarAuditoria(
    sessao.escolaId, sessao.usuarioId,
    `${d.habilitado ? "modulo.habilitar" : "modulo.desabilitar"}:${d.moduloId}`,
    "modulos_escola", null, randomUUID(),
  );
  return NextResponse.json({ ok: true });
}
