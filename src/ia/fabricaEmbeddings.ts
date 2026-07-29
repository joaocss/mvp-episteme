// Seleciona o provedor de embeddings de forma consistente entre ingestao e
// consulta (o vetor da pergunta PRECISA usar o mesmo modelo dos documentos).
//   USAR_MOCK=1            -> mock (sem chave)
//   EMBEDDING_PROVEDOR=ollama -> local (Ollama)
//   (padrao)              -> Gemini
import { ProvedorEmbeddings } from "./tipos";
import { EmbeddingsMock } from "./provedorMock";
import { EmbeddingsGemini } from "./provedorGemini";
import { EmbeddingsOllama } from "./provedorOllama";

export function criarEmbeddings(): ProvedorEmbeddings {
  if (process.env.USAR_MOCK === "1") return new EmbeddingsMock(768);
  const provedor = (process.env.EMBEDDING_PROVEDOR ?? "gemini").toLowerCase();
  if (provedor === "ollama") return new EmbeddingsOllama();
  return new EmbeddingsGemini();
}
