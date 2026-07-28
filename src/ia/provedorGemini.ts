// Provedores REAIS (Google Gemini) via API REST. Precisam de LLM_API_KEY /
// EMBEDDING_API_KEY no ambiente. Ainda NAO testados ponta a ponta (sem chave
// no ambiente de dev do Claude); a assinatura e o fluxo espelham o mock, entao
// o pipeline nao muda ao trocar o provedor.

import { ProvedorEmbeddings, ProvedorLlm, RespostaLlm } from "./tipos";

const BASE_API = "https://generativelanguage.googleapis.com/v1beta";

export class EmbeddingsGemini implements ProvedorEmbeddings {
  readonly nome = "gemini-text-embedding-004";
  readonly dimensao = 768;
  constructor(private readonly chave = process.env.EMBEDDING_API_KEY ?? "") {}

  async gerar(texto: string): Promise<number[]> {
    const url = `${BASE_API}/models/text-embedding-004:embedContent?key=${this.chave}`;
    const resposta = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text: texto }] },
      }),
    });
    if (!resposta.ok) throw new Error(`Embeddings falhou: ${resposta.status}`);
    const dados = await resposta.json();
    return dados.embedding.values as number[];
  }
}

export class LlmGemini implements ProvedorLlm {
  readonly nome = "gemini-2.5-flash-lite";
  constructor(private readonly chave = process.env.LLM_API_KEY ?? "") {}

  async gerar(prompt: string): Promise<RespostaLlm> {
    const url = `${BASE_API}/models/gemini-2.5-flash-lite:generateContent?key=${this.chave}`;
    const resposta = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
      }),
    });
    if (!resposta.ok) throw new Error(`LLM falhou: ${resposta.status}`);
    const dados = await resposta.json();
    const texto = dados.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const uso = dados.usageMetadata ?? {};
    return {
      texto,
      modelo: this.nome,
      tokensEntrada: uso.promptTokenCount,
      tokensSaida: uso.candidatesTokenCount,
    };
  }
}
