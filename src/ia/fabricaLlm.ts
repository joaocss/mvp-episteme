// Seleciona o provedor de geracao (LLM).
//   USAR_MOCK=1          -> mock
//   LLM_PROVEDOR=gemini  -> Gemini (opcional; nao usado em producao hoje)
//   (padrao)             -> OpenAI (gpt-4o-mini)
import { ProvedorLlm } from "./tipos";
import { LlmMock } from "./provedorMock";
import { LlmGemini } from "./provedorGemini";
import { LlmOpenAI } from "./provedorOpenAI";

export function criarLlm(): ProvedorLlm {
  if (process.env.USAR_MOCK === "1") return new LlmMock();
  const provedor = (process.env.LLM_PROVEDOR ?? "openai").toLowerCase();
  if (provedor === "gemini") return new LlmGemini();
  return new LlmOpenAI();
}
