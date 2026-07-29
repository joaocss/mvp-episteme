// Embeddings locais via Ollama (nomic-embed-text, 768 dimensoes). Roda em
// localhost, sem limite de taxa e sem enviar dados a terceiros — bom para
// volume alto de ingestao e para privacidade de dados de menores.
import { ProvedorEmbeddings } from "./tipos";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODELO = process.env.OLLAMA_MODELO ?? "nomic-embed-text";

export class EmbeddingsOllama implements ProvedorEmbeddings {
  readonly nome = `ollama:${OLLAMA_MODELO}`;
  readonly dimensao = 768;

  async gerar(texto: string): Promise<number[]> {
    const r = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODELO, prompt: texto }),
    });
    if (!r.ok) throw new Error(`Ollama ${r.status}: ${await r.text()}`);
    const dados = await r.json();
    return dados.embedding as number[];
  }

  async gerarLote(textos: string[]): Promise<number[][]> {
    const saida: number[][] = [];
    for (const t of textos) saida.push(await this.gerar(t)); // local: sem rate limit
    return saida;
  }
}
