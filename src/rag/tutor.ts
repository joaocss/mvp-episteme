// Pipeline do tutor: guardrail de entrada -> (minimiza PII) -> embedding ->
// busca -> grounding -> prompt -> LLM -> guardrail de saida.
import { ProvedorEmbeddings, ProvedorLlm, RepositorioTrechos, TrechoRecuperado } from "../ia/tipos";
import {
  guardrailEntrada, guardrailSaida, minimizarPii, EventoGuardrail,
  MENSAGEM_SEGURANCA, MENSAGEM_SEM_BASE,
} from "../ia/guardrails";

export const LIMIAR_GROUNDING = 0.12;
const TOP_K = 3;

export const REGRAS_SISTEMA =
  "Voce e um tutor de Matematica do 6o ano. Responda em linguagem simples, " +
  "adequada a uma crianca de 11 anos, passo a passo. Use APENAS o conteudo " +
  "fornecido. Se a resposta nao estiver no conteudo, diga que nao encontrou no " +
  "material e sugira falar com o professor. Nunca entregue apenas a resposta " +
  "final de uma tarefa avaliativa. Jamais use linguagem punitiva ou humilhante.";

export interface Dependencias {
  embeddings: ProvedorEmbeddings;
  llm: ProvedorLlm;
  repositorio: RepositorioTrechos;
}

export interface ResultadoTutor {
  recusado: boolean;
  motivo?: string;
  resposta?: string;
  fontes: TrechoRecuperado[];
  eventos: EventoGuardrail[];
  telemetria: { melhorScore: number; modelo?: string; tokensEntrada?: number; tokensSaida?: number };
}

function montarPrompt(pergunta: string, trechos: TrechoRecuperado[]): string {
  const contexto = trechos
    .map((t) => `[${(t.metadados as any).codigo_bncc ?? ""}] ${(t.metadados as any).titulo ?? ""}: ${t.texto}`)
    .join("\n");
  return (
    `### REGRAS\n${REGRAS_SISTEMA}\n\n` +
    `### CONTEUDO DO MATERIAL (fonte)\n${contexto}\n\n` +
    `### PERGUNTA DO ALUNO\n${pergunta}\n`
  );
}

export async function responder(
  escolaId: string,
  pergunta: string,
  dep: Dependencias,
): Promise<ResultadoTutor> {
  const eventos = guardrailEntrada(pergunta);
  const base: ResultadoTutor = { recusado: false, fontes: [], eventos, telemetria: { melhorScore: 0 } };

  // Sinal de risco -> acolhe e encaminha a um adulto (nao segue com o tutor).
  if (eventos.some((e) => e.categoria === "seguranca_infantil")) {
    return { ...base, recusado: true, motivo: "seguranca_infantil", resposta: MENSAGEM_SEGURANCA };
  }

  const perguntaSegura = minimizarPii(pergunta); // nao envia PII ao LLM
  const vetor = await dep.embeddings.gerar(perguntaSegura);
  const fontes = await dep.repositorio.buscar(escolaId, vetor, TOP_K);
  const melhorScore = fontes[0]?.score ?? 0;
  base.telemetria.melhorScore = Number(melhorScore.toFixed(3));
  base.fontes = fontes;

  if (melhorScore < LIMIAR_GROUNDING) {
    return { ...base, recusado: true, motivo: "sem_base", resposta: MENSAGEM_SEM_BASE };
  }

  const prompt = montarPrompt(perguntaSegura, fontes);
  const saidaLlm = await dep.llm.gerar(prompt);
  const saida = guardrailSaida(saidaLlm.texto);

  return {
    ...base,
    resposta: saida.texto,
    eventos: [...eventos, ...saida.eventos],
    telemetria: {
      melhorScore: base.telemetria.melhorScore,
      modelo: saidaLlm.modelo,
      tokensEntrada: saidaLlm.tokensEntrada,
      tokensSaida: saidaLlm.tokensSaida,
    },
  };
}
