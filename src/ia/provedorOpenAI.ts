// Provedores REAIS (OpenAI). Embeddings text-embedding-3-small pedindo 768
// dimensoes (casa com o banco) e geracao via chat/completions. Tier pago tem
// limites de taxa altos — resolve o gargalo de ingestao em lote.
import { ProvedorEmbeddings, ProvedorLlm, RespostaLlm } from "./tipos";

const BASE_API = "https://api.openai.com/v1";
const MODELO_EMBEDDING = process.env.OPENAI_MODELO_EMBEDDING ?? "text-embedding-3-small";
const MODELO_LLM = process.env.OPENAI_MODELO ?? "gpt-4o-mini";

async function requisitar(caminho: string, chave: string, corpo: unknown, tentativas = 4): Promise<any> {
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(`${BASE_API}${caminho}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${chave}` },
      body: JSON.stringify(corpo),
    });
    if (r.ok) return r.json();
    if (r.status !== 429 && r.status < 500) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
    await new Promise((res) => setTimeout(res, 3000 * (i + 1)));
  }
  throw new Error("OpenAI: excedidas as retentativas (limite de taxa).");
}

export class EmbeddingsOpenAI implements ProvedorEmbeddings {
  readonly nome = MODELO_EMBEDDING;
  readonly dimensao = 768;
  constructor(private readonly chave = process.env.OPENAI_API_KEY ?? "") {}

  async gerar(texto: string): Promise<number[]> {
    const d = await requisitar("/embeddings", this.chave, {
      model: MODELO_EMBEDDING, input: texto, dimensions: this.dimensao,
    });
    return d.data[0].embedding as number[];
  }

  async gerarLote(textos: string[]): Promise<number[][]> {
    const d = await requisitar("/embeddings", this.chave, {
      model: MODELO_EMBEDDING, input: textos, dimensions: this.dimensao,
    });
    return (d.data as Array<{ embedding: number[]; index: number }>)
      .sort((a, b) => a.index - b.index)
      .map((e) => e.embedding);
  }
}

export class LlmOpenAI implements ProvedorLlm {
  readonly nome = MODELO_LLM;
  constructor(private readonly chave = process.env.OPENAI_API_KEY ?? "") {}

  async gerar(prompt: string, opcoes?: { maxTokens?: number }): Promise<RespostaLlm> {
    const d = await requisitar("/chat/completions", this.chave, {
      model: MODELO_LLM,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: opcoes?.maxTokens ?? 500,
    });
    const texto = d.choices?.[0]?.message?.content ?? "";
    const uso = d.usage ?? {};
    return { texto, modelo: this.nome, tokensEntrada: uso.prompt_tokens, tokensSaida: uso.completion_tokens };
  }
}
