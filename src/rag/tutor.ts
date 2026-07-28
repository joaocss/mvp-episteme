// Pipeline do tutor: guardrail de entrada -> embedding -> busca -> grounding
// -> montagem do prompt -> LLM -> guardrail de saida. Recebe as dependencias
// por injecao (mock ou real), entao a logica e a mesma em dev e producao.

import { ProvedorEmbeddings, ProvedorLlm, RepositorioTrechos, TrechoRecuperado } from "../ia/tipos";
import { guardrailEntrada, guardrailSaida, EventoGuardrail } from "../ia/guardrails";

// Abaixo deste limiar de similaridade, o tutor RECUSA em vez de inventar.
export const LIMIAR_GROUNDING = 0.12;
const TOP_K = 3;

export const REGRAS_SISTEMA =
  "Voce e um tutor de Matematica do 6o ano. Responda em linguagem simples, " +
  "adequada a uma crianca de 11 anos, passo a passo. Use APENAS o conteudo " +
  "fornecido. Se a resposta nao estiver no conteudo, diga que nao encontrou no " +
  "material e sugira falar com o professor. Nunca entregue apenas a resposta " +
  "final de uma tarefa avaliativa. Jamais use linguagem punitiva ou " +
  "humilhante (Lei 13.010).";

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

  if (eventos.some((e) => e.acao === "bloqueado")) {
    return { ...base, recusado: true, motivo: "guardrail de entrada bloqueou a mensagem" };
  }

  const vetor = await dep.embeddings.gerar(pergunta);
  const fontes = await dep.repositorio.buscar(escolaId, vetor, TOP_K);
  const melhorScore = fontes[0]?.score ?? 0;
  base.telemetria.melhorScore = Number(melhorScore.toFixed(3));
  base.fontes = fontes;

  if (melhorScore < LIMIAR_GROUNDING) {
    return { ...base, recusado: true, motivo: "sem base no material (grounding)" };
  }

  const prompt = montarPrompt(pergunta, fontes);
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
