// Seleciona o provedor de embeddings (deve ser o MESMO na ingestao e na consulta).
//   USAR_MOCK=1                 -> mock
//   EMBEDDING_PROVEDOR=openai   -> OpenAI
//   EMBEDDING_PROVEDOR=ollama   -> Ollama (local)
//   (padrao)                    -> Gemini
import { ProvedorEmbeddings } from "./tipos";
import { EmbeddingsMock } from "./provedorMock";
import { EmbeddingsGemini } from "./provedorGemini";
import { EmbeddingsOllama } from "./provedorOllama";
import { EmbeddingsOpenAI } from "./provedorOpenAI";

export function criarEmbeddings(): ProvedorEmbeddings {
  if (process.env.USAR_MOCK === "1") return new EmbeddingsMock(768);
  const provedor = (process.env.EMBEDDING_PROVEDOR ?? "gemini").toLowerCase();
  if (provedor === "openai") return new EmbeddingsOpenAI();
  if (provedor === "ollama") return new EmbeddingsOllama();
  return new EmbeddingsGemini();
}
