// Anexos do aluno (laudos, fotos, relatorios) — metadados no Postgres,
// binario no Supabase Storage (bucket privado 'anexos-alunos', acessado so pelo
// backend via service_role). Usado na inclusao (aluno atipico) e pela IA na
// geracao de plano inclusivo. Isolamento por escola_id.
import { randomUUID } from "node:crypto";
import { pool } from "./pool";
import { criarClienteBackend } from "./cliente";

const BUCKET = "anexos-alunos";

export interface AnexoAluno {
  id: string; nome: string; tipo: string | null; tamanho: number | null; caminho: string; criadoEm: string;
}

export async function listarAnexos(escolaId: string, alunoId: string): Promise<AnexoAluno[]> {
  const { rows } = await pool.query(
    `select id, nome, tipo, tamanho, caminho, criado_em from aluno_anexos
     where escola_id = $1 and aluno_id = $2 order by criado_em desc`,
    [escolaId, alunoId],
  );
  return rows.map((r) => ({
    id: r.id, nome: r.nome, tipo: r.tipo ?? null, tamanho: r.tamanho ?? null,
    caminho: r.caminho, criadoEm: new Date(r.criado_em).toISOString(),
  }));
}

// Sobe o binario para o Storage e grava os metadados. Retorna o id do anexo.
export async function subirAnexo(
  escolaId: string, alunoId: string,
  arquivo: { nome: string; tipo: string; tamanho: number; bytes: Uint8Array },
): Promise<string> {
  const caminho = `${escolaId}/${alunoId}/${randomUUID()}-${arquivo.nome.replace(/[^\w.\-]+/g, "_")}`;
  const cliente = criarClienteBackend();
  const { error } = await cliente.storage.from(BUCKET).upload(caminho, arquivo.bytes, {
    contentType: arquivo.tipo || "application/octet-stream", upsert: false,
  });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  const { rows } = await pool.query(
    `insert into aluno_anexos (escola_id, aluno_id, nome, tipo, tamanho, caminho)
     values ($1,$2,$3,$4,$5,$6) returning id`,
    [escolaId, alunoId, arquivo.nome, arquivo.tipo || null, arquivo.tamanho || null, caminho],
  );
  return rows[0].id;
}

// URL assinada temporaria para visualizar/baixar um anexo (o bucket e privado).
export async function urlAssinadaAnexo(escolaId: string, anexoId: string): Promise<string | null> {
  const { rows } = await pool.query(
    `select caminho from aluno_anexos where escola_id = $1 and id = $2`,
    [escolaId, anexoId],
  );
  if (!rows[0]) return null;
  const cliente = criarClienteBackend();
  const { data, error } = await cliente.storage.from(BUCKET).createSignedUrl(rows[0].caminho, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function excluirAnexo(escolaId: string, anexoId: string): Promise<void> {
  const { rows } = await pool.query(
    `select caminho from aluno_anexos where escola_id = $1 and id = $2`, [escolaId, anexoId],
  );
  if (!rows[0]) return;
  const cliente = criarClienteBackend();
  await cliente.storage.from(BUCKET).remove([rows[0].caminho]).catch(() => {});
  await pool.query(`delete from aluno_anexos where escola_id = $1 and id = $2`, [escolaId, anexoId]);
}

// Contexto textual dos anexos para a IA (nomes/tipos — o conteudo do laudo em si
// nao e OCR-ado aqui; a IA usa nome + observacoes do professor/gestor).
export async function resumoAnexosParaIa(escolaId: string, alunoId: string): Promise<string> {
  const anexos = await listarAnexos(escolaId, alunoId);
  if (anexos.length === 0) return "";
  return "Documentos anexados: " + anexos.map((a) => a.nome).join(", ") + ".";
}
