// Importacao de alunos por planilha CSV — restrito ao gestor/diretor, auditado.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { lerSessaoPermitida } from "../../../../../lib/sessao";
import { importarAlunosCsv } from "../../../../../src/bd/importacao";
import { registrarAuditoria } from "../../../../../src/rag/repositorioConversas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerSessaoPermitida((n) => armazem.get(n)?.value, ["gestor", "admin"]);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) {
    return NextResponse.json({ erro: "acesso restrito ao diretor" }, { status: 403 });
  }

  let form: FormData;
  try { form = await requisicao.formData(); }
  catch { return NextResponse.json({ erro: "envie o arquivo como multipart/form-data" }, { status: 400 }); }

  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: "anexe um arquivo CSV" }, { status: 400 });
  if (arquivo.size > 5 * 1024 * 1024) return NextResponse.json({ erro: "arquivo acima de 5 MB" }, { status: 400 });

  const conteudo = await arquivo.text();
  const origem = new URL(requisicao.url).origin;
  const resultado = await importarAlunosCsv(sessao.escolaId, conteudo, origem);
  await registrarAuditoria(sessao.escolaId, sessao.usuarioId, `aluno.importar(${resultado.criados})`, "usuarios", null, randomUUID())
    .catch(() => {});
  return NextResponse.json({ ok: true, ...resultado });
}
