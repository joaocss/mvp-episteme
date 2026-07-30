// Repositorio via conexao direta ao Postgres (DATABASE_URL). Usado por scripts
// administrativos (ingestao) e CLIs. Conecta como usuario 'postgres', que tem
// direito de escrita — evita depender do formato de chave do PostgREST. O RLS
// permanece ativo; o app (Next.js) continuara usando o cliente com JWT do usuario.
import { pool } from "../bd/pool";
import { ChunkParaInserir, RepositorioTrechos, TrechoRecuperado, TrechoBncc } from "../ia/tipos";

function vetorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

export class RepositorioPostgres implements RepositorioTrechos {
  constructor() {}

  async inserir(escolaId: string, chunks: ChunkParaInserir[]): Promise<void> {
    const cliente = await pool.connect();
    try {
      await cliente.query("begin");
      for (const c of chunks) {
        await cliente.query(
          `insert into material_chunks
             (escola_id, material_id, ordem, texto, metadados, embedding)
           values ($1, $2, $3, $4, $5::jsonb, $6::vector)`,
          [escolaId, c.materialId, c.ordem, c.texto, JSON.stringify(c.metadados), vetorLiteral(c.embedding)],
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

  async buscar(escolaId: string, consulta: number[], limite: number): Promise<TrechoRecuperado[]> {
    const { rows } = await pool.query(
      "select chunk_id, texto, metadados, score from buscar_trechos($1, $2::vector, $3)",
      [escolaId, vetorLiteral(consulta), limite],
    );
    return rows.map((r) => ({
      chunkId: r.chunk_id,
      texto: r.texto,
      metadados: r.metadados,
      score: Number(r.score),
    }));
  }

  async classificarBncc(consulta: number[]): Promise<string | null> {
    const { rows } = await pool.query(`select buscar_bncc($1::vector) as codigo`, [vetorLiteral(consulta)]);
    return rows[0]?.codigo ?? null;
  }

  async buscarBncc(consulta: number[], limite: number): Promise<TrechoBncc[]> {
    const { rows } = await pool.query(
      "select codigo, descricao, unidade_tematica, score from buscar_bncc_similar($1::vector, $2)",
      [vetorLiteral(consulta), limite],
    );
    return rows.map((r) => ({
      codigo: r.codigo, descricao: r.descricao, unidadeTematica: r.unidade_tematica ?? null, score: Number(r.score),
    }));
  }

  async encerrar(): Promise<void> {
    /* pool compartilhado: nao encerrar aqui */
  }
}
