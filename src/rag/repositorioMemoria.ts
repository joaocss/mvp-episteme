// Repositorio em memoria: usado na demo e nos testes, sem banco.
import { ChunkParaInserir, RepositorioTrechos, TrechoRecuperado } from "../ia/tipos";
import { similaridadeCosseno } from "../ia/texto";

interface Registro extends ChunkParaInserir { escolaId: string; chunkId: string; }

export class RepositorioMemoria implements RepositorioTrechos {
  private registros: Registro[] = [];
  private contador = 0;

  async inserir(escolaId: string, chunks: ChunkParaInserir[]): Promise<void> {
    for (const chunk of chunks) {
      this.registros.push({ ...chunk, escolaId, chunkId: `chunk_${this.contador++}` });
    }
  }

  async buscar(escolaId: string, consulta: number[], limite: number): Promise<TrechoRecuperado[]> {
    return this.registros
      .filter((r) => r.escolaId === escolaId) // isolamento por tenant (aqui em memoria)
      .map((r) => ({
        chunkId: r.chunkId,
        texto: r.texto,
        metadados: r.metadados,
        score: similaridadeCosseno(consulta, r.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limite);
  }
}
