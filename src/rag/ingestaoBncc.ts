// Gera embeddings das habilidades BNCC (competencias_bncc) para a classificacao.
// Uso:  tsx src/rag/ingestaoBncc.ts
import { pool } from "../bd/pool";
import { carregarEnvLocal } from "../bd/ambiente";
import { criarEmbeddings } from "../ia/fabricaEmbeddings";

carregarEnvLocal();

function vetorLiteral(v: number[]): string { return `[${v.join(",")}]`; }

async function principal() {
  const embeddings = criarEmbeddings();
  console.log(`Embeddings: ${embeddings.nome}`);
  // So etiqueta as habilidades ainda sem embedding (re-runs baratos: apos
  // acrescentar habilidades novas via migration, so as novas sao vetorizadas).
  const { rows } = await pool.query(
    `select codigo, descricao from competencias_bncc where embedding is null order by codigo`,
  );
  console.log(`Habilidades a processar (sem embedding): ${rows.length}`);
  if (rows.length === 0) { console.log("Nada a fazer."); await pool.end(); return; }

  const textos = rows.map((r: any) => r.descricao as string);
  const vetores = typeof embeddings.gerarLote === "function"
    ? await embeddings.gerarLote(textos)
    : await Promise.all(textos.map((t) => embeddings.gerar(t)));

  for (let i = 0; i < rows.length; i++) {
    await pool.query(`update competencias_bncc set embedding = $1::vector where codigo = $2`,
      [vetorLiteral(vetores[i]), rows[i].codigo]);
  }
  console.log(`Concluido: ${rows.length} habilidades etiquetadas.`);
  await pool.end();
}

principal().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
