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
  const { rows } = await pool.query(`select codigo, descricao from competencias_bncc order by codigo`);
  console.log(`Habilidades a processar: ${rows.length}`);

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
