// Camada de banco do versionamento de materiais (ingestao incremental).
// Uma VERSAO por upload; so uma 'vigente' por material. Publicacao atomica.
// Todas as escritas passam pelo pool privilegiado — SEMPRE filtrar por escola_id
// para preservar o isolamento entre escolas.
import { pool } from "./pool";

export type StatusVersao =
  | "pendente" | "extraindo" | "vetorizando" | "vigente"
  | "substituida" | "falhou" | "duplicada";

export interface Versao {
  id: string;
  materialId: string;
  versao: number;
  status: StatusVersao;
  hashArquivo: string | null;
  paginas: number | null;
  caracteres: number | null;
  chunksTotal: number;
  chunksReusados: number;
  erro: string | null;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  publicadoEm: string | null;
  excluidoEm: string | null;
  criadoEm: string;
}

// Formata um vetor number[] no literal aceito por pgvector ("[1,2,3]").
export function vetorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

// Chunk pronto para inserir sob uma versao. O embedding ja vem como LITERAL de
// vetor (string) — seja recem-gerado (formatado por vetorLiteral) ou reusado de
// uma versao anterior (lido do banco ja nesse formato).
export interface ChunkVersao {
  ordem: number;
  texto: string;
  hashConteudo: string;
  metadados: Record<string, unknown>;
  embeddingLiteral: string;
}

// Versao vigente de um material (ou null). Usada para reuso de embeddings e
// para saber qual versao aposentar na publicacao.
export async function versaoVigente(escolaId: string, materialId: string): Promise<Versao | null> {
  const { rows } = await pool.query(
    `select * from material_versoes
     where escola_id = $1 and material_id = $2 and status = 'vigente' and excluido_em is null
     limit 1`,
    [escolaId, materialId],
  );
  return rows[0] ? mapear(rows[0]) : null;
}

// Idempotencia: ja existe uma versao NAO-excluida deste material com este hash
// de arquivo? (reupload identico -> 'duplicada', sem reprocessar).
export async function versaoComHash(
  escolaId: string, materialId: string, hashArquivo: string,
): Promise<Versao | null> {
  const { rows } = await pool.query(
    `select * from material_versoes
     where escola_id = $1 and material_id = $2 and hash_arquivo = $3
       and excluido_em is null and status in ('vigente','substituida')
     order by versao desc limit 1`,
    [escolaId, materialId, hashArquivo],
  );
  return rows[0] ? mapear(rows[0]) : null;
}

export async function proximaVersao(escolaId: string, materialId: string): Promise<number> {
  const { rows } = await pool.query(
    `select coalesce(max(versao), 0) + 1 as prox from material_versoes
     where escola_id = $1 and material_id = $2`,
    [escolaId, materialId],
  );
  return Number(rows[0].prox);
}

export async function criarVersao(
  escolaId: string, materialId: string, versao: number, hashArquivo: string,
): Promise<string> {
  const { rows } = await pool.query(
    `insert into material_versoes (escola_id, material_id, versao, status, hash_arquivo)
     values ($1, $2, $3, 'extraindo', $4) returning id`,
    [escolaId, materialId, versao, hashArquivo],
  );
  return rows[0].id;
}

export async function atualizarStatusVersao(
  escolaId: string,
  versaoId: string,
  status: StatusVersao,
  extras: Partial<{ paginas: number; caracteres: number; chunksTotal: number; chunksReusados: number; erro: string }> = {},
): Promise<void> {
  await pool.query(
    `update material_versoes set
       status = $3,
       paginas = coalesce($4, paginas),
       caracteres = coalesce($5, caracteres),
       chunks_total = coalesce($6, chunks_total),
       chunks_reusados = coalesce($7, chunks_reusados),
       erro = $8
     where id = $2 and escola_id = $1`,
    [escolaId, versaoId, status,
      extras.paginas ?? null, extras.caracteres ?? null,
      extras.chunksTotal ?? null, extras.chunksReusados ?? null, extras.erro ?? null],
  );
}

// Mapa hash_conteudo -> embedding (literal string) dos chunks de uma versao.
// Usado para reaproveitar embeddings de chunks identicos na versao nova.
export async function embeddingsPorHash(
  escolaId: string, versaoId: string,
): Promise<Map<string, string>> {
  const { rows } = await pool.query(
    `select hash_conteudo, embedding::text as embedding
     from material_chunks
     where escola_id = $1 and versao_id = $2 and hash_conteudo is not null`,
    [escolaId, versaoId],
  );
  const mapa = new Map<string, string>();
  for (const r of rows) if (r.hash_conteudo && r.embedding) mapa.set(r.hash_conteudo, r.embedding);
  return mapa;
}

// Insere os chunks de uma versao em lote, numa transacao.
export async function inserirChunksVersao(
  escolaId: string, materialId: string, versaoId: string, chunks: ChunkVersao[],
): Promise<void> {
  const cliente = await pool.connect();
  try {
    await cliente.query("begin");
    for (const c of chunks) {
      await cliente.query(
        `insert into material_chunks
           (escola_id, material_id, versao_id, ordem, texto, hash_conteudo, metadados, embedding)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::vector)`,
        [escolaId, materialId, versaoId, c.ordem, c.texto, c.hashConteudo,
          JSON.stringify(c.metadados), c.embeddingLiteral],
      );
    }
    await cliente.query("commit");
  } catch (e) {
    await cliente.query("rollback");
    throw e;
  } finally {
    cliente.release();
  }
}

// Publicacao ATOMICA: numa unica transacao, aposenta a versao vigente atual
// (-> 'substituida') e promove a nova (-> 'vigente' + publicado_em). O indice
// parcial uniq_versao_vigente garante que nunca ha duas vigentes.
export async function publicarVersao(
  escolaId: string, materialId: string, novaVersaoId: string,
): Promise<void> {
  const cliente = await pool.connect();
  try {
    await cliente.query("begin");
    await cliente.query(
      `update material_versoes set status = 'substituida'
       where escola_id = $1 and material_id = $2 and status = 'vigente' and id <> $3`,
      [escolaId, materialId, novaVersaoId],
    );
    await cliente.query(
      `update material_versoes set status = 'vigente', publicado_em = now(), erro = null
       where escola_id = $1 and id = $2`,
      [escolaId, novaVersaoId],
    );
    await cliente.query("commit");
  } catch (e) {
    await cliente.query("rollback");
    throw e;
  } finally {
    cliente.release();
  }
}

// Delecao logica de uma versao (nao apaga chunks; a busca deixa de servi-los).
export async function excluirVersaoLogicamente(escolaId: string, versaoId: string): Promise<void> {
  await pool.query(
    `update material_versoes set excluido_em = now(),
       status = case when status = 'vigente' then 'substituida' else status end
     where escola_id = $1 and id = $2`,
    [escolaId, versaoId],
  );
}

export async function listarVersoes(escolaId: string, materialId: string): Promise<Versao[]> {
  const { rows } = await pool.query(
    `select * from material_versoes
     where escola_id = $1 and material_id = $2
     order by versao desc`,
    [escolaId, materialId],
  );
  return rows.map(mapear);
}

function mapear(r: any): Versao {
  return {
    id: r.id,
    materialId: r.material_id,
    versao: Number(r.versao),
    status: r.status,
    hashArquivo: r.hash_arquivo ?? null,
    paginas: r.paginas ?? null,
    caracteres: r.caracteres ?? null,
    chunksTotal: Number(r.chunks_total) || 0,
    chunksReusados: Number(r.chunks_reusados) || 0,
    erro: r.erro ?? null,
    vigenciaInicio: r.vigencia_inicio ? new Date(r.vigencia_inicio).toISOString().slice(0, 10) : null,
    vigenciaFim: r.vigencia_fim ? new Date(r.vigencia_fim).toISOString().slice(0, 10) : null,
    publicadoEm: r.publicado_em ? new Date(r.publicado_em).toISOString() : null,
    excluidoEm: r.excluido_em ? new Date(r.excluido_em).toISOString() : null,
    criadoEm: new Date(r.criado_em).toISOString(),
  };
}
