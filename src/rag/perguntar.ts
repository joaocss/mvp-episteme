// Faz uma pergunta ao tutor usando o pipeline real (Gemini + Supabase).
// Uso: tsx src/rag/perguntar.ts <escolaId> "sua pergunta"
import { EmbeddingsGemini, LlmGemini } from "../ia/provedorGemini";
import { RepositorioSupabase } from "./repositorioSupabase";
import { criarClienteBackend } from "../bd/cliente";
import { responder, Dependencias } from "./tutor";

async function principal() {
  const [, , escolaId, ...resto] = process.argv;
  const pergunta = resto.join(" ");
  if (!escolaId || !pergunta) {
    console.error('Uso: tsx src/rag/perguntar.ts <escolaId> "sua pergunta"');
    process.exit(1);
  }
  const dep: Dependencias = {
    embeddings: new EmbeddingsGemini(),
    llm: new LlmGemini(),
    repositorio: new RepositorioSupabase(criarClienteBackend()),
  };
  const r = await responder(escolaId, pergunta, dep);
  console.log(JSON.stringify(r, null, 2));
}

principal().catch((e) => { console.error(e); process.exit(1); });
