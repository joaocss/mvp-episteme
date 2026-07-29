// Provedores REAIS (Google Gemini) via API REST, autenticando pelo cabecalho
// X-goog-api-key (formato atual). Com retentativa em 429/5xx (limite de taxa).
import { ProvedorEmbeddings, ProvedorLlm, RespostaLlm } from "./tipos";

const BASE_API = "https://generativelanguage.googleapis.com/v1beta";
const MODELO_EMBEDDING = "gemini-embedding-001";
const MODELO_LLM = "gemini-2.5-flash-lite";

async function requisitar(url: string, chave: string, corpo: unknown, tentativas = 4): Promise<any> {
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": chave },
      body: JSON.stringify(corpo),
    });
    if (r.ok) return r.json();
    if (r.status !== 429 && r.status < 500) {
      throw new Error(`Gemini ${r.status}: ${await r.text()}`);
    }
    await new Promise((res) => setTimeout(res, 1500 * (i + 1))); // backoff
  }
  throw new Error("Gemini: excedidas as retentativas (limite de taxa).");
}

export class EmbeddingsGemini implements ProvedorEmbeddings {
  readonly nome = MODELO_EMBEDDING;
  readonly dimensao = 768;
  constructor(private readonly chave = process.env.EMBEDDING_API_KEY ?? "") {}

  async gerar(texto: string): Promise<number[]> {
    const dados = await requisitar(
      `${BASE_API}/models/${MODELO_EMBEDDING}:embedContent`,
      this.chave,
      { model: `models/${MODELO_EMBEDDING}`, content: { parts: [{ text: texto }] }, outputDimensionality: this.dimensao },
    );
    return dados.embedding.values as number[];
  }
}

export class LlmGemini implements ProvedorLlm {
  readonly nome = MODELO_LLM;
  constructor(private readonly chave = process.env.LLM_API_KEY ?? "") {}

  async gerar(prompt: string): Promise<RespostaLlm> {
    const dados = await requisitar(
      `${BASE_API}/models/${MODELO_LLM}:generateContent`,
      this.chave,
      { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 500 } },
    );
    const texto = dados.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const uso = dados.usageMetadata ?? {};
    return { texto, modelo: this.nome, tokensEntrada: uso.promptTokenCount, tokensSaida: uso.candidatesTokenCount };
  }
}
