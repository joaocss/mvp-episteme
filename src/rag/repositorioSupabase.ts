// Repositorio real: grava em material_chunks e busca via RPC buscar_trechos
// (definida em supabase/migrations/...busca_vetorial.sql). O isolamento por
// escola e reforcado pelo RLS no banco.
import { SupabaseClient } from "@supabase/supabase-js";
import { ChunkParaInserir, RepositorioTrechos, TrechoRecuperado } from "../ia/tipos";

export class RepositorioSupabase implements RepositorioTrechos {
  constructor(private readonly cliente: SupabaseClient) {}

  async inserir(escolaId: string, chunks: ChunkParaInserir[]): Promise<void> {
    const linhas = chunks.map((c) => ({
      escola_id: escolaId,
      material_id: c.materialId,
      ordem: c.ordem,
      texto: c.texto,
      metadados: c.metadados,
      embedding: c.embedding,
    }));
    const { error } = await this.cliente.from("material_chunks").insert(linhas);
    if (error) throw new Error(`Falha ao inserir chunks: ${error.message}`);
  }

  async buscar(escolaId: string, consulta: number[], limite: number): Promise<TrechoRecuperado[]> {
    const { data, error } = await this.cliente.rpc("buscar_trechos", {
      p_escola_id: escolaId,
      p_consulta: consulta,
      p_limite: limite,
    });
    if (error) throw new Error(`Falha na busca: ${error.message}`);
    return (data ?? []).map((r: any) => ({
      chunkId: r.chunk_id,
      texto: r.texto,
      metadados: r.metadados,
      score: r.score,
    }));
  }
}
