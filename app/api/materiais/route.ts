// Materiais-fonte da escola: upload de PDF (professor/diretor), listagem,
// (re)vinculo de turmas e exclusao. O upload cria o material, vincula as
// turmas escolhidas e dispara a ingestao (extrai texto -> chunk -> embeddings
// -> material_chunks). Auditado. Isolamento por escola vem da sessao.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { lerSessaoPermitida } from "../../../lib/sessao";
import {
  criarMaterial, listarMateriais, excluirMaterial, definirTurmasDoMaterial, vincularMaterialTurma,
  materialPertenceAEscola, definirPublicoDoMaterial, type PublicoAudiencia,
} from "../../../src/bd/materiais";
import { ingerirPdfIncremental } from "../../../src/rag/ingestaoIncremental/pipeline";
import { registrarAuditoria } from "../../../src/rag/repositorioConversas";

export const runtime = "nodejs";
export const maxDuration = 60; // ingestao de PDF pode levar alguns segundos

const PAPEIS_OK = ["professor", "gestor", "admin"];
const LIMITE_BYTES = 20 * 1024 * 1024; // 20 MB

function sessaoValida() {
  return cookies().then((armazem) => lerSessaoPermitida((n) => armazem.get(n)?.value, ["professor", "gestor", "admin"]));
}

export async function GET() {
  const sessao = await sessaoValida();
  if (!sessao || !PAPEIS_OK.includes(sessao.papel)) {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const materiais = await listarMateriais(sessao.escolaId);
  return NextResponse.json({ materiais });
}

export async function POST(requisicao: Request) {
  const sessao = await sessaoValida();
  if (!sessao || !PAPEIS_OK.includes(sessao.papel)) {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const esc = sessao.escolaId;

  let form: FormData;
  try { form = await requisicao.formData(); }
  catch { return NextResponse.json({ erro: "envie os dados como multipart/form-data" }, { status: 400 }); }

  // materialId presente = REVISAR um material existente (nova versao do conteudo).
  // Ausente = criar um material novo (versao 1).
  const revisarId = String(form.get("materialId") ?? "").trim() || null;
  const titulo = String(form.get("titulo") ?? "").trim();
  const tipo = String(form.get("tipo") ?? "apostila").trim() || "apostila";
  const referencia = String(form.get("referencia") ?? "").trim() || null;
  const turmaIds = form.getAll("turmaIds").map((t) => String(t)).filter(Boolean);
  // Audiencias por papel/escola: so gestor/admin pode definir (professor fica nas turmas).
  const ehGestor = sessao.papel === "gestor" || sessao.papel === "admin";
  const publicos = ehGestor ? parsePublicos(form.get("publicos")) : [];
  const arquivo = form.get("arquivo");
  // Docs de audiencia (papel/escola) sem turma nao sao "materia": disciplina/ano
  // viram placeholders e a busca por audiencia os ignora.
  const soAudiencia = turmaIds.length === 0 && publicos.length > 0;
  const disciplina = String(form.get("disciplina") ?? "").trim() || (soAudiencia ? "geral" : "");
  const ano = String(form.get("ano") ?? "").trim() || (soAudiencia ? "todos" : "");

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "anexe um arquivo PDF" }, { status: 400 });
  }
  if (arquivo.type && arquivo.type !== "application/pdf" && !arquivo.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ erro: "o arquivo precisa ser um PDF" }, { status: 400 });
  }
  if (arquivo.size > LIMITE_BYTES) {
    return NextResponse.json({ erro: "PDF acima de 20 MB" }, { status: 400 });
  }

  // Descobre/cria o material alvo.
  let materialId: string;
  if (revisarId) {
    if (!(await materialPertenceAEscola(esc, revisarId))) {
      return NextResponse.json({ erro: "material nao encontrado" }, { status: 404 });
    }
    materialId = revisarId;
  } else {
    if (!titulo || !disciplina || !ano) {
      return NextResponse.json({ erro: "informe titulo, disciplina e ano" }, { status: 400 });
    }
    materialId = await criarMaterial(esc, { tipo, disciplina, ano, titulo, referencia });
    for (const turmaId of turmaIds) await vincularMaterialTurma(esc, materialId, turmaId);
    if (publicos.length) await definirPublicoDoMaterial(esc, materialId, publicos);
  }

  try {
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const resultado = await ingerirPdfIncremental(esc, materialId, bytes);
    await registrarAuditoria(
      esc, sessao.usuarioId, revisarId ? "material.revisar" : "material.upload",
      "materiais_fonte", materialId, randomUUID(),
    );
    return NextResponse.json({ ok: true, materialId, ...resultado });
  } catch (e: any) {
    // Material novo com falha fica com status 'erro'; revisao que falha NAO
    // derruba a versao vigente anterior (o pipeline mantem o material servindo).
    return NextResponse.json(
      { erro: e?.message?.includes("escaneado") ? e.message : "Falha ao processar o PDF.", materialId },
      { status: 400 },
    );
  }
}

export async function PATCH(requisicao: Request) {
  const sessao = await sessaoValida();
  if (!sessao || !PAPEIS_OK.includes(sessao.papel)) {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const d = await requisicao.json().catch(() => ({}));
  if (!d.materialId) return NextResponse.json({ erro: "material nao informado" }, { status: 400 });
  // Posse: o material precisa ser DESTA escola antes de qualquer escrita
  // (senao um gestor da escola A alteraria audiencia de material da escola B).
  if (!(await materialPertenceAEscola(sessao.escolaId, String(d.materialId)))) {
    return NextResponse.json({ erro: "material nao encontrado" }, { status: 404 });
  }
  if (Array.isArray(d.turmaIds)) {
    await definirTurmasDoMaterial(sessao.escolaId, d.materialId, d.turmaIds.map(String));
    await registrarAuditoria(
      sessao.escolaId, sessao.usuarioId, "material.turmas",
      "materiais_fonte", String(d.materialId), randomUUID(),
    );
  }
  // Audiencias por papel/escola: so gestor/admin. Mudanca sensivel (quem a IA
  // atende com base no doc), por isso auditada.
  if (Array.isArray(d.publicos) && (sessao.papel === "gestor" || sessao.papel === "admin")) {
    await definirPublicoDoMaterial(sessao.escolaId, d.materialId, normalizarPublicos(d.publicos));
    await registrarAuditoria(
      sessao.escolaId, sessao.usuarioId, "material.audiencia",
      "materiais_fonte", String(d.materialId), randomUUID(),
    );
  }
  return NextResponse.json({ ok: true });
}

// Normaliza/valida regras de audiencia vindas do cliente.
function normalizarPublicos(bruto: unknown): PublicoAudiencia[] {
  if (!Array.isArray(bruto)) return [];
  const out: PublicoAudiencia[] = [];
  for (const r of bruto) {
    if (r?.tipo === "escola") out.push({ tipo: "escola" });
    else if (r?.tipo === "papel" && ["aluno", "professor", "gestor"].includes(r?.papel)) {
      out.push({ tipo: "papel", papel: r.papel });
    }
  }
  return out;
}

function parsePublicos(campo: FormDataEntryValue | null): PublicoAudiencia[] {
  if (typeof campo !== "string" || !campo.trim()) return [];
  try { return normalizarPublicos(JSON.parse(campo)); } catch { return []; }
}

export async function DELETE(requisicao: Request) {
  const sessao = await sessaoValida();
  if (!sessao || !PAPEIS_OK.includes(sessao.papel)) {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const materialId = new URL(requisicao.url).searchParams.get("id") ?? "";
  if (!materialId) return NextResponse.json({ erro: "material não informado" }, { status: 400 });
  await excluirMaterial(sessao.escolaId, materialId);
  await registrarAuditoria(sessao.escolaId, sessao.usuarioId, "material.excluir", "materiais_fonte", materialId, randomUUID());
  return NextResponse.json({ ok: true });
}
