// Ingestao REAL de um livro para o Supabase, com embeddings do Gemini.
// Uso:
//   tsx src/rag/ingestaoLivro.ts <caminho_txt> <escolaId> <materialId>
// Requer no ambiente: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// EMBEDDING_API_KEY. Extraia o txt antes: pdftotext livro.pdf livro.txt
import { readFileSync } from "node:fs";
import { EmbeddingsGemini } from "../ia/provedorGemini";
import { RepositorioSupabase } from "./repositorioSupabase";
import { criarClienteBackend } from "../bd/cliente";
import { chunkarTexto } from "./chunkerTexto";
import { ChunkParaInserir } from "../ia/tipos";

const LOTE = 50;

async function principal() {
  const [, , caminho, escolaId, materialId] = process.argv;
  if (!caminho || !escolaId || !materialId) {
    console.error("Uso: tsx src/rag/ingestaoLivro.ts <caminho_txt> <escolaId> <materialId>");
    process.exit(1);
  }
  const embeddings = new EmbeddingsGemini();
  const repo = new RepositorioSupabase(criarClienteBackend());

  const chunks = chunkarTexto(readFileSync(caminho, "utf-8"));
  console.log(`Chunks: ${chunks.length}. Gerando embeddings (${embeddings.nome})...`);

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

principal().catch((e) => { console.error(e); process.exit(1); });
