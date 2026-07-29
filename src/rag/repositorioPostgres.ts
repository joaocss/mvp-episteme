// Repositorio via conexao direta ao Postgres (DATABASE_URL). Usado por scripts
// administrativos (ingestao) e CLIs. Conecta como usuario 'postgres', que tem
// direito de escrita — evita depender do formato de chave do PostgREST. O RLS
// permanece ativo; o app (Next.js) continuara usando o cliente com JWT do usuario.
import pg from "pg";
import { ChunkParaInserir, RepositorioTrechos, TrechoRecuperado } from "../ia/tipos";

function vetorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

export class RepositorioPostgres implements RepositorioTrechos {
  private readonly pool: pg.Pool;

  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) throw new Error("Defina DATABASE_URL no .env.local");
    this.pool = new pg.Pool({ connectionString });
  }

  async inserir(escolaId: string, chunks: ChunkParaInserir[]): Promise<void> {
    const cliente = await this.pool.connect();
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
    const { rows } = await this.pool.query(
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
    const { rows } = await this.pool.query(`select buscar_bncc($1::vector) as codigo`, [vetorParaLiteral(consulta)]);
    return rows[0]?.codigo ?? null;
  }

  async encerrar(): Promise<void> {
    await this.pool.end();
  }
}
