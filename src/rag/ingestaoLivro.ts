// Ingestao de um livro (texto) para o banco, com embeddings EM LOTE.
// Uso:  tsx src/rag/ingestaoLivro.ts <caminho_txt> <escolaId> <materialId>
// Provedor: USAR_MOCK=1 | EMBEDDING_PROVEDOR=ollama | (padrao Gemini)
// Free tier do Gemini: use PAUSA_LOTE_MS=60000 e TAM_LOTE menor, ou prefira Ollama.
import { readFileSync } from "node:fs";
import { carregarEnvLocal } from "../bd/ambiente";
import { criarEmbeddings } from "../ia/fabricaEmbeddings";
import { ProvedorEmbeddings, ChunkParaInserir, RepositorioTrechos } from "../ia/tipos";
import { RepositorioSupabase } from "./repositorioSupabase";
import { RepositorioPostgres } from "./repositorioPostgres";
import { criarClienteBackend } from "../bd/cliente";
import { chunkarTexto } from "./chunkerTexto";

carregarEnvLocal();
const USAR_MOCK = process.env.USAR_MOCK === "1";
const TAM_LOTE = Number(process.env.TAM_LOTE ?? 100);
const PAUSA_LOTE_MS = Number(process.env.PAUSA_LOTE_MS ?? 0);

function criarRepositorio(): RepositorioTrechos {
  return process.env.DATABASE_URL
    ? new RepositorioPostgres()
    : new RepositorioSupabase(criarClienteBackend());
}

async function gerarVetores(embeddings: ProvedorEmbeddings, textos: string[]): Promise<number[][]> {
  if (typeof embeddings.gerarLote === "function") return embeddings.gerarLote(textos);
  return Promise.all(textos.map((t) => embeddings.gerar(t)));
}

async function principal() {
  const [, , caminho, escolaId, materialId] = process.argv;
  if (!caminho || !escolaId || !materialId) {
    console.error("Uso: tsx src/rag/ingestaoLivro.ts <caminho_txt> <escolaId> <materialId>");
    process.exit(1);
  }
  const embeddings = criarEmbeddings();
  const repo = criarRepositorio();
  console.log(`>>> Embeddings: ${embeddings.nome}${USAR_MOCK ? " (MOCK)" : ""} | lote=${TAM_LOTE} pausa=${PAUSA_LOTE_MS}ms <<<`);

  const chunks = chunkarTexto(readFileSync(caminho, "utf-8"));
  console.log(`Chunks: ${chunks.length}. Gravando...`);

  let feitos = 0;
  for (let i = 0; i < chunks.length; i += TAM_LOTE) {
    const grupo = chunks.slice(i, i + TAM_LOTE);
    const vetores = await gerarVetores(embeddings, grupo.map((c) => c.texto));
    const paraInserir: ChunkParaInserir[] = grupo.map((c, j) => ({
      materialId,
      ordem: c.ordem,
      texto: c.texto,
      metadados: { fonte: materialId },
      embedding: vetores[j],
    }));
    await repo.inserir(escolaId, paraInserir);
    feitos += grupo.length;
    console.log(`  gravados ${feitos}/${chunks.length}`);
    if (PAUSA_LOTE_MS > 0 && i + TAM_LOTE < chunks.length) {
      await new Promise((res) => setTimeout(res, PAUSA_LOTE_MS));
    }
  }
  console.log(`Concluido: ${feitos} trechos ingeridos.`);
}

principal()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
