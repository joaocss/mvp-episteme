// Seleciona o provedor de embeddings (deve ser o MESMO na ingestao e na consulta).
//   USAR_MOCK=1                 -> mock
//   EMBEDDING_PROVEDOR=gemini   -> Gemini (opcional; nao usado em producao hoje)
//   EMBEDDING_PROVEDOR=ollama   -> Ollama (local)
//   (padrao)                    -> OpenAI (text-embedding-3-small, 768d)
import { ProvedorEmbeddings } from "./tipos";
import { EmbeddingsMock } from "./provedorMock";
import { EmbeddingsGemini } from "./provedorGemini";
import { EmbeddingsOllama } from "./provedorOllama";
import { EmbeddingsOpenAI } from "./provedorOpenAI";

export function criarEmbeddings(): ProvedorEmbeddings {
  if (process.env.USAR_MOCK === "1") return new EmbeddingsMock(768);
  const provedor = (process.env.EMBEDDING_PROVEDOR ?? "openai").toLowerCase();
  if (provedor === "gemini") return new EmbeddingsGemini();
  if (provedor === "ollama") return new EmbeddingsOllama();
  return new EmbeddingsOpenAI();
}
