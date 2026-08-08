// Registro de consentimento parental (LGPD, modo soft) pelo responsavel. Valida
// que o responsavel logado esta vinculado ao aluno (por email em responsaveis)
// antes de registrar. Nao bloqueia nada — apenas registra o aceite.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { lerSessaoPermitida } from "../../../../lib/sessao";
import { obterUsuarioBasico } from "../../../../src/bd/usuarios";
import { filhosDoResponsavel } from "../../../../src/bd/responsavel";
import { termoVigente, registrarConsentimento } from "../../../../src/bd/consentimento";
import { registrarAuditoria } from "../../../../src/rag/repositorioConversas";

export const runtime = "nodejs";

export async function POST(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerSessaoPermitida((n) => armazem.get(n)?.value, ["responsavel"]);
  if (!sessao || sessao.papel !== "responsavel") {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const d = await requisicao.json().catch(() => ({}));
  const alunoId = String(d.alunoId ?? "").trim();
  if (!alunoId) return NextResponse.json({ erro: "aluno nao informado" }, { status: 400 });

  const usuario = await obterUsuarioBasico(sessao.escolaId, sessao.usuarioId);
  const email = usuario?.email ?? "";
  if (!email) return NextResponse.json({ erro: "responsavel sem email" }, { status: 400 });

  // Vinculo: o aluno precisa estar entre os filhos do responsavel (por email).
  const filhos = await filhosDoResponsavel(sessao.escolaId, email);
  if (!filhos.some((f) => f.alunoId === alunoId)) {
    return NextResponse.json({ erro: "aluno nao vinculado" }, { status: 404 });
  }

  const termo = await termoVigente();
  if (!termo) return NextResponse.json({ erro: "termo indisponivel" }, { status: 400 });

  await registrarConsentimento(sessao.escolaId, alunoId, email, sessao.usuarioId, termo.versao);
  await registrarAuditoria(sessao.escolaId, sessao.usuarioId, "consentimento.conceder", "consentimentos", alunoId, randomUUID());
  return NextResponse.json({ ok: true });
}
