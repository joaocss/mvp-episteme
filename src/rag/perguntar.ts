// Pergunta ao tutor pelo pipeline real. Provedores por env:
//   EMBEDDING_PROVEDOR / LLM_PROVEDOR = openai | ollama | gemini | (USAR_MOCK=1)
// Uso:  tsx src/rag/perguntar.ts <escolaId> "sua pergunta"
import { carregarEnvLocal } from "../bd/ambiente";
import { criarEmbeddings } from "../ia/fabricaEmbeddings";
import { criarLlm } from "../ia/fabricaLlm";
import { RepositorioSupabase } from "./repositorioSupabase";
import { RepositorioPostgres } from "./repositorioPostgres";
import { RepositorioTrechos } from "../ia/tipos";
import { criarClienteBackend } from "../bd/cliente";
import { responder, Dependencias } from "./tutor";

carregarEnvLocal();

function criarRepositorio(): RepositorioTrechos {
  return process.env.DATABASE_URL
    ? new RepositorioPostgres()
    : new RepositorioSupabase(criarClienteBackend());
}

async function principal() {
  const [, , escolaId, ...resto] = process.argv;
  const pergunta = resto.join(" ");
  if (!escolaId || !pergunta) {
    console.error('Uso: tsx src/rag/perguntar.ts <escolaId> "sua pergunta"');
    process.exit(1);
  }
  const dep: Dependencias = {
    embeddings: criarEmbeddings(),
    llm: criarLlm(),
    repositorio: criarRepositorio(),
  };
  console.log(`>>> embeddings=${dep.embeddings.nome} | llm=${dep.llm.nome} <<<`);
  const r = await responder(escolaId, pergunta, dep);
  console.log(JSON.stringify(r, null, 2));
}

principal()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
