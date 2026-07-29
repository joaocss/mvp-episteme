// Pergunta ao tutor pelo pipeline real (Supabase + Gemini).
// Uso:  tsx src/rag/perguntar.ts <escolaId> "sua pergunta"
// Para testar SEM chave do Gemini: USAR_MOCK=1
import { carregarEnvLocal } from "../bd/ambiente";
import { EmbeddingsGemini, LlmGemini } from "../ia/provedorGemini";
import { EmbeddingsMock, LlmMock } from "../ia/provedorMock";
import { RepositorioSupabase } from "./repositorioSupabase";
import { criarClienteBackend } from "../bd/cliente";
import { responder, Dependencias } from "./tutor";

carregarEnvLocal();
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
    repositorio: new RepositorioSupabase(criarClienteBackend()),
  };
  const r = await responder(escolaId, pergunta, dep);
  console.log(JSON.stringify(r, null, 2));
}

principal().catch((e) => { console.error(e); process.exit(1); });
