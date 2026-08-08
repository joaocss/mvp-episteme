// Anexos do aluno (laudos/fotos) — upload/listagem/exclusao/url-assinada.
// Restrito a gestor/admin e professor (equipe que monta o plano inclusivo).
// Binario vai para o Supabase Storage (bucket privado); metadados no Postgres.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { lerSessaoPermitida } from "../../../../../lib/sessao";
import { listarAnexos, subirAnexo, excluirAnexo, urlAssinadaAnexo } from "../../../../../src/bd/anexos";
import { registrarAuditoria } from "../../../../../src/rag/repositorioConversas";

export const runtime = "nodejs";
export const maxDuration = 60;

const PAPEIS_OK = ["gestor", "admin", "professor"];
const LIMITE_BYTES = 15 * 1024 * 1024; // 15 MB por anexo

async function sessaoOk() {
  const armazem = await cookies();
  const s = lerSessaoPermitida((n) => armazem.get(n)?.value, PAPEIS_OK);
  return s && PAPEIS_OK.includes(s.papel) ? s : null;
}

// GET ?alunoId=... -> lista; GET ?anexoId=... -> url assinada (redirect).
export async function GET(requisicao: Request) {
  const s = await sessaoOk();
  if (!s) return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const url = new URL(requisicao.url);
  const anexoId = url.searchParams.get("anexoId");
  if (anexoId) {
    const assinada = await urlAssinadaAnexo(s.escolaId, anexoId);
    if (!assinada) return NextResponse.json({ erro: "anexo nao encontrado" }, { status: 404 });
    return NextResponse.redirect(assinada);
  }
  const alunoId = url.searchParams.get("alunoId") ?? "";
  if (!alunoId) return NextResponse.json({ erro: "aluno nao informado" }, { status: 400 });
  return NextResponse.json({ anexos: await listarAnexos(s.escolaId, alunoId) });
}

export async function POST(requisicao: Request) {
  const s = await sessaoOk();
  if (!s) return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  let form: FormData;
  try { form = await requisicao.formData(); }
  catch { return NextResponse.json({ erro: "envie multipart/form-data" }, { status: 400 }); }
  const alunoId = String(form.get("alunoId") ?? "").trim();
  const arquivo = form.get("arquivo");
  if (!alunoId || !(arquivo instanceof File)) {
    return NextResponse.json({ erro: "informe o aluno e anexe um arquivo" }, { status: 400 });
  }
  if (arquivo.size > LIMITE_BYTES) {
    return NextResponse.json({ erro: "arquivo acima de 15 MB" }, { status: 400 });
  }
  try {
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const id = await subirAnexo(s.escolaId, alunoId, {
      nome: arquivo.name, tipo: arquivo.type, tamanho: arquivo.size, bytes,
    });
    await registrarAuditoria(s.escolaId, s.usuarioId, "aluno.anexo.upload", "aluno_anexos", id, randomUUID());
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message ?? "Falha no upload." }, { status: 400 });
  }
}

export async function DELETE(requisicao: Request) {
  const s = await sessaoOk();
  if (!s) return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  const anexoId = new URL(requisicao.url).searchParams.get("id") ?? "";
  if (!anexoId) return NextResponse.json({ erro: "anexo nao informado" }, { status: 400 });
  await excluirAnexo(s.escolaId, anexoId);
  await registrarAuditoria(s.escolaId, s.usuarioId, "aluno.anexo.excluir", "aluno_anexos", anexoId, randomUUID());
  return NextResponse.json({ ok: true });
}
