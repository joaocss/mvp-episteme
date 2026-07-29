// Ingestao REAL de um livro (texto extraido de PDF), com embeddings mock, para
// validar o chunker e a busca sobre conteudo verdadeiro. A qualidade final
// depende de embeddings reais (Gemini); aqui provamos a mecanica ponta a ponta.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EmbeddingsMock } from "../ia/provedorMock";
import { RepositorioMemoria } from "./repositorioMemoria";
import { chunkarTexto } from "./chunkerTexto";
import { ChunkParaInserir } from "../ia/tipos";

const AQUI = dirname(fileURLToPath(import.meta.url));
const ESCOLA = "escola-demo";

async function principal() {
  const embeddings = new EmbeddingsMock(128);
  const repo = new RepositorioMemoria();

  const texto = readFileSync(join(AQUI, "..", "..", "rag", "exemplo", "superacao_6ano.txt"), "utf-8");
  const chunks = chunkarTexto(texto);
  console.log(`Livro chunkado em ${chunks.length} trechos (alvo ~900 chars).`);

  const paraInserir: ChunkParaInserir[] = [];
  for (const c of chunks) {
    paraInserir.push({
      materialId: "superacao-6ano",
      ordem: c.ordem,
      texto: c.texto,
      metadados: { fonte: "Superacao Matematica 6 ano" },
      embedding: await embeddings.gerar(c.texto),
    });
  }
  await repo.inserir(ESCOLA, paraInserir);
  console.log(`Ingeridos ${paraInserir.length} trechos.\n`);

  const perguntas = [
    "o que sao frações equivalentes?",
    "como localizar um ponto no plano cartesiano?",
    "quais sao os divisores de um numero?",
    "como calcular porcentagem?",
  ];

  for (const pergunta of perguntas) {
    const vetor = await embeddings.gerar(pergunta);
    const achados = await repo.buscar(ESCOLA, vetor, 2);
    console.log("=".repeat(70));
    console.log(`PERGUNTA: ${pergunta}`);
    for (const a of achados) {
      console.log(`  [score ${a.score.toFixed(2)}] ${a.texto.slice(0, 130).replace(/\s+/g, " ")}...`);
    }
  }
}

principal().catch((e) => { console.error(e); process.exit(1); });
