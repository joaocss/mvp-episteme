// Ingestao de um livro (texto) para o banco, com embeddings EM LOTE.
// Uso:  tsx src/rag/ingestaoLivro.ts <caminho_txt> <escolaId> <materialId>
// Env:  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EMBEDDING_API_KEY, DATABASE_URL
// Sem chave do Gemini (embedding mock 768d): USAR_MOCK=1
import { readFileSync } from "node:fs";
import { carregarEnvLocal } from "../bd/ambiente";
import { EmbeddingsGemini } from "../ia/provedorGemini";
import { EmbeddingsMock } from "../ia/provedorMock";
import { ProvedorEmbeddings, ChunkParaInserir, RepositorioTrechos } from "../ia/tipos";
import { RepositorioSupabase } from "./repositorioSupabase";
import { RepositorioPostgres } from "./repositorioPostgres";
import { criarClienteBackend } from "../bd/cliente";
import { chunkarTexto } from "./chunkerTexto";

carregarEnvLocal();
const USAR_MOCK = process.env.USAR_MOCK === "1";
console.log(USAR_MOCK ? ">>> MODO: MOCK (Gemini desligado) <<<" : ">>> MODO: REAL (Gemini) <<<");
const TAM_LOTE = 100; // embeddings por chamada (batchEmbedContents)

function criarEmbeddings(): ProvedorEmbeddings {
  return USAR_MOCK ? new EmbeddingsMock(768) : new EmbeddingsGemini();
}

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
  console.log(`Provedor de embeddings: ${embeddings.nome}${USAR_MOCK ? " (MOCK)" : ""}`);

  const chunks = chunkarTexto(readFileSync(caminho, "utf-8"));
  console.log(`Chunks: ${chunks.length}. Gravando em lotes de ${TAM_LOTE}...`);

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
  }
  console.log(`Concluido: ${feitos} trechos ingeridos.`);
}

principal()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
