// Provedores MOCK para desenvolvimento e testes, sem depender de chave de API.
// O embedding e um "hashing vectorizer" de dimensao fixa; o LLM devolve uma
// resposta simulada a partir do contexto. Em producao troca-se por provedorGemini.

import { ProvedorEmbeddings, ProvedorLlm, RespostaLlm } from "./tipos";
import { tokenizar } from "./texto";

export class EmbeddingsMock implements ProvedorEmbeddings {
  readonly nome = "mock-hashing";
  constructor(readonly dimensao = 64) {}

  async gerar(texto: string): Promise<number[]> {
    const vetor = new Array<number>(this.dimensao).fill(0);
    for (const token of tokenizar(texto)) {
      const indice = this.hash(token) % this.dimensao;
      vetor[indice] += 1;
    }
    return vetor;
  }

  async gerarLote(textos: string[]): Promise<number[][]> {
    return Promise.all(textos.map((t) => this.gerar(t)));
  }

  private hash(token: string): number {
    let h = 2166136261;
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }
}

export class LlmMock implements ProvedorLlm {
  readonly nome = "mock-llm";
  async gerar(prompt: string): Promise<RespostaLlm> {
    // Nao ha modelo de verdade: devolve um texto que confirma que o pipeline
    // montou o contexto corretamente.
    const trechoContexto = (prompt.split("### CONTEUDO DO MATERIAL (fonte)")[1] ?? "")
      .split("### PERGUNTA")[0]
      .trim()
      .slice(0, 160);
    return {
      texto: `(resposta simulada) Vou explicar com base no material: ${trechoContexto}...`,
      modelo: "mock-llm",
      tokensEntrada: Math.ceil(prompt.length / 4),
      tokensSaida: 40,
    };
  }
}
