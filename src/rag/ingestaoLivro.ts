// Ingestao de um livro (texto) para o Supabase.
// Uso:  tsx src/rag/ingestaoLivro.ts <caminho_txt> <escolaId> <materialId>
// Env:  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EMBEDDING_API_KEY
// Para testar SEM chave do Gemini (embedding mock de 768d): USAR_MOCK=1
import { readFileSync } from "node:fs";
import { carregarEnvLocal } from "../bd/ambiente";
import { EmbeddingsGemini } from "../ia/provedorGemini";
import { EmbeddingsMock } from "../ia/provedorMock";
import { ProvedorEmbeddings, ChunkParaInserir } from "../ia/tipos";
import { RepositorioSupabase } from "./repositorioSupabase";
import { RepositorioPostgres } from "./repositorioPostgres";
import { RepositorioTrechos } from "../ia/tipos";
import { criarClienteBackend } from "../bd/cliente";
import { chunkarTexto } from "./chunkerTexto";

carregarEnvLocal();

function criarRepositorio(): RepositorioTrechos {
  // Tarefa de backend: conexao direta ao Postgres se houver DATABASE_URL;
  // senao, cliente Supabase (usado pelo app com JWT do usuario).
  return process.env.DATABASE_URL
    ? new RepositorioPostgres()
    : new RepositorioSupabase(criarClienteBackend());
}
const USAR_MOCK = process.env.USAR_MOCK === "1";
console.log(USAR_MOCK ? ">>> MODO: MOCK (Gemini desligado) <<<" : ">>> MODO: REAL (Gemini) <<<");
const LOTE = 50;

function criarEmbeddings(): ProvedorEmbeddings {
  return USAR_MOCK ? new EmbeddingsMock(768) : new EmbeddingsGemini();
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
  console.log(`Chunks: ${chunks.length}. Gravando...`);

  let lote: ChunkParaInserir[] = [];
  let feitos = 0;
  for (const c of chunks) {
    lote.push({
      materialId,
      ordem: c.ordem,
      texto: c.texto,
      metadados: { fonte: materialId },
      embedding: await embeddings.gerar(c.texto),
    });
    if (lote.length >= LOTE) {
      await repo.inserir(escolaId, lote);
      feitos += lote.length;
      console.log(`  gravados ${feitos}/${chunks.length}`);
      lote = [];
    }
  }
  if (lote.length) { await repo.inserir(escolaId, lote); feitos += lote.length; }
  console.log(`Concluido: ${feitos} trechos ingeridos.`);
}

principal()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
