// Contratos (interfaces) da camada de IA. Trocar de provedor = trocar a
// implementacao, sem tocar no pipeline do tutor.

export interface ProvedorEmbeddings {
  readonly nome: string;
  readonly dimensao: number;
  gerar(texto: string): Promise<number[]>;
}

export interface RespostaLlm {
  texto: string;
  modelo: string;
  tokensEntrada?: number;
  tokensSaida?: number;
}

export interface ProvedorLlm {
  readonly nome: string;
  gerar(prompt: string): Promise<RespostaLlm>;
}

export interface TrechoRecuperado {
  chunkId: string;
  texto: string;
  metadados: Record<string, unknown>;
  score: number;
}

// Repositorio dos trechos: em memoria (demo/testes) ou no Supabase/pgvector.
export interface RepositorioTrechos {
  inserir(escolaId: string, chunks: ChunkParaInserir[]): Promise<void>;
  buscar(escolaId: string, consulta: number[], limite: number): Promise<TrechoRecuperado[]>;
}

export interface ChunkParaInserir {
  materialId: string;
  ordem: number;
  texto: string;
  metadados: Record<string, unknown>;
  embedding: number[];
}
