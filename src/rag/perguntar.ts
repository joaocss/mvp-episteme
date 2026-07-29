// Pergunta ao tutor pelo pipeline real (Supabase + Gemini).
// Uso:  tsx src/rag/perguntar.ts <escolaId> "sua pergunta"
// Para testar SEM chave do Gemini: USAR_MOCK=1
import { carregarEnvLocal } from "../bd/ambiente";
import { EmbeddingsGemini, LlmGemini } from "../ia/provedorGemini";
import { EmbeddingsMock, LlmMock } from "../ia/provedorMock";
import { RepositorioSupabase } from "./repositorioSupabase";
import { RepositorioPostgres } from "./repositorioPostgres";
import { RepositorioTrechos } from "../ia/tipos";
import { criarClienteBackend } from "../bd/cliente";
import { responder, Dependencias } from "./tutor";

carregarEnvLocal();

function criarRepositorio(): RepositorioTrechos {
  // Tarefa de backend: conexao direta ao Postgres se houver DATABASE_URL;
  // senao, cliente Supabase (usado pelo app com JWT do usuario).
  return process.env.DATABASE_URL
    ? new RepositorioPostgres()
    : new RepositorioSupabase(criarClienteBackend());
}
const USAR_MOCK = process.env.USAR_MOCK === "1";

async function principal() {
  const [, , escolaId, ...resto] = process.argv;
  const pergunta = resto.join(" ");
  if (!escolaId || !pergunta) {
    console.error('Uso: tsx src/rag/perguntar.ts <escolaId> "sua pergunta"');
    process.exit(1);
  }
  const dep: Dependencias = {
    embeddings: USAR_MOCK ? new EmbeddingsMock(768) : new EmbeddingsGemini(),
    llm: USAR_MOCK ? new LlmMock() : new LlmGemini(),
    repositorio: criarRepositorio(),
  };
  const r = await responder(escolaId, pergunta, dep);
  console.log(JSON.stringify(r, null, 2));
}

principal()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
