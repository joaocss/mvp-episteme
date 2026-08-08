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

  async gerar(prompt: string, opcoes?: { maxTokens?: number; imagemBase64?: string }): Promise<RespostaLlm> {
    const content = opcoes?.imagemBase64
      ? [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: opcoes.imagemBase64 } }]
      : prompt;
    const d = await requisitar("/chat/completions", this.chave, {
      model: MODELO_LLM,
      messages: [{ role: "user", content }],
      temperature: 0.3,
      max_tokens: opcoes?.maxTokens ?? 500,
    });
    const texto = d.choices?.[0]?.message?.content ?? "";
    const uso = d.usage ?? {};
    return { texto, modelo: this.nome, tokensEntrada: uso.prompt_tokens, tokensSaida: uso.completion_tokens };
  }

  // Geracao em streaming (SSE do /chat/completions). Chama aoReceber a cada
  // pedaco de texto e acumula o total; include_usage traz os tokens no ultimo
  // frame. Retenta apenas na ABERTURA da conexao (429/5xx); uma vez fluindo, um
  // erro de rede encerra o stream com o que ja veio.
  async gerarStream(
    prompt: string,
    aoReceber: (delta: string) => void,
    opcoes?: { maxTokens?: number; imagemBase64?: string },
  ): Promise<RespostaLlm> {
    const content = opcoes?.imagemBase64
      ? [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: opcoes.imagemBase64 } }]
      : prompt;
    const corpo = {
      model: MODELO_LLM,
      messages: [{ role: "user", content }],
      temperature: 0.3,
      max_tokens: opcoes?.maxTokens ?? 500,
      stream: true,
      stream_options: { include_usage: true },
    };

    let resposta: Response | null = null;
    for (let i = 0; i < 4; i++) {
      const r = await fetch(`${BASE_API}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.chave}` },
        body: JSON.stringify(corpo),
      });
      if (r.ok) { resposta = r; break; }
      if (r.status !== 429 && r.status < 500) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
      await new Promise((res) => setTimeout(res, 3000 * (i + 1)));
    }
    if (!resposta?.body) throw new Error("OpenAI: excedidas as retentativas (streaming).");

    const leitor = resposta.body.getReader();
    const decodificador = new TextDecoder();
    let buffer = "";
    let texto = "";
    let tokensEntrada: number | undefined;
    let tokensSaida: number | undefined;

    // Processa uma linha "data: {...}" do fluxo SSE.
    const processarLinha = (linha: string) => {
      const limpa = linha.trim();
      if (!limpa.startsWith("data:")) return;
      const dados = limpa.slice(5).trim();
      if (dados === "[DONE]") return;
      try {
        const evento = JSON.parse(dados);
        const delta = evento.choices?.[0]?.delta?.content;
        if (delta) { texto += delta; aoReceber(delta); }
        if (evento.usage) {
          tokensEntrada = evento.usage.prompt_tokens;
          tokensSaida = evento.usage.completion_tokens;
        }
      } catch { /* frame parcial: ignora (a linha completa vem no proximo read) */ }
    };

    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      buffer += decodificador.decode(value, { stream: true });
      let quebra: number;
      while ((quebra = buffer.indexOf("\n")) >= 0) {
        processarLinha(buffer.slice(0, quebra));
        buffer = buffer.slice(quebra + 1);
      }
    }
    if (buffer.trim()) processarLinha(buffer);

    return { texto, modelo: this.nome, tokensEntrada, tokensSaida };
  }
}
