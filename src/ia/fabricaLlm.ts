// Seleciona o provedor de geracao (LLM).
//   USAR_MOCK=1          -> mock
//   LLM_PROVEDOR=openai  -> OpenAI
//   (padrao)             -> Gemini
import { ProvedorLlm } from "./tipos";
import { LlmMock } from "./provedorMock";
import { LlmGemini } from "./provedorGemini";
import { LlmOpenAI } from "./provedorOpenAI";

export function criarLlm(): ProvedorLlm {
  if (process.env.USAR_MOCK === "1") return new LlmMock();
  const provedor = (process.env.LLM_PROVEDOR ?? "gemini").toLowerCase();
  if (provedor === "openai") return new LlmOpenAI();
  return new LlmGemini();
}
