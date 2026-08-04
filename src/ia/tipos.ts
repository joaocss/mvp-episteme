// Contratos (interfaces) da camada de IA. Trocar de provedor = trocar a
// implementacao, sem tocar no pipeline do tutor.

export interface ProvedorEmbeddings {
  readonly nome: string;
  readonly dimensao: number;
  gerar(texto: string): Promise<number[]>;
  // Opcional: embeddar varios textos numa unica chamada (evita rate limit).
  gerarLote?(textos: string[]): Promise<number[][]>;
}

export interface RespostaLlm {
  texto: string;
  modelo: string;
  tokensEntrada?: number;
  tokensSaida?: number;
}

export interface ProvedorLlm {
  readonly nome: string;
  // imagemBase64: data URL (ex.: "data:image/png;base64,...") de uma foto enviada
  // pelo aluno junto da pergunta. Provedores sem suporte a visao podem ignorar.
  gerar(prompt: string, opcoes?: { maxTokens?: number; imagemBase64?: string }): Promise<RespostaLlm>;
}

export interface TrechoRecuperado {
  chunkId: string;
  texto: string;
  metadados: Record<string, unknown>;
  score: number;
}

export interface TrechoBncc {
  codigo: string;
  descricao: string;
  unidadeTematica: string | null;
  score: number;
}

// Filtro de disciplina/serie (Fase 7: multi-serie/multi-disciplina) e de turma
// (conteudo escopado por turma). Todos opcionais; omitir = busca sem aquele
// filtro (comportamento anterior). Quando turmaId e informado, a busca no livro
// retorna apenas trechos de materiais vinculados aquela turma.
export interface FiltroConteudo { disciplina?: string; ano?: string; turmaId?: string }

// Repositorio dos trechos: em memoria (demo/testes) ou no Supabase/pgvector.
export interface RepositorioTrechos {
  inserir(escolaId: string, chunks: ChunkParaInserir[]): Promise<void>;
  buscar(escolaId: string, consulta: number[], limite: number, filtro?: FiltroConteudo): Promise<TrechoRecuperado[]>;
  // Opcional: classifica um vetor na habilidade BNCC mais proxima.
  classificarBncc?(consulta: number[], filtro?: FiltroConteudo): Promise<string | null>;
  // Opcional: busca habilidades BNCC proximas do vetor, com score (2a camada de grounding).
  buscarBncc?(consulta: number[], limite: number, filtro?: FiltroConteudo): Promise<TrechoBncc[]>;
}

export interface ChunkParaInserir {
  materialId: string;
  ordem: number;
  texto: string;
  metadados: Record<string, unknown>;
  embedding: number[];
}
