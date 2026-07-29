// Pipeline do tutor: guardrail -> (PII) -> embedding -> busca -> grounding ->
// prompt -> LLM -> guardrail de saida. Inclui modo "questoes de treino".
import { ProvedorEmbeddings, ProvedorLlm, RepositorioTrechos, TrechoRecuperado } from "../ia/tipos";
import { normalizar } from "../ia/texto";
import {
  guardrailEntrada, guardrailSaida, minimizarPii, EventoGuardrail,
  MENSAGEM_SEGURANCA, MENSAGEM_SEM_BASE,
} from "../ia/guardrails";

export const LIMIAR_GROUNDING = 0.12;
const TOP_K = 3;

// Parceira cognitiva (alinhado ao ensaio sobre regressao cognitiva): o tutor
// faz o aluno pensar, da pistas antes da resposta e nao entrega tudo pronto.
export const REGRAS_SISTEMA =
  "Voce e um tutor de Matematica do 6o ano e atua como PARCEIRA COGNITIVA: seu " +
  "papel e fazer o aluno PENSAR, nao pensar por ele. Responda em linguagem simples, " +
  "adequada a uma crianca de 11 anos, passo a passo. Antes de dar a resposta pronta, " +
  "incentive o aluno a tentar e ofereca pistas. Use APENAS o conteudo fornecido; se a " +
  "resposta nao estiver nele, diga que nao encontrou no material e sugira falar com o " +
  "professor. NUNCA entregue apenas a resposta final de uma tarefa avaliativa. Jamais " +
  "use linguagem punitiva ou humilhante.";

const REGRAS_QUESTOES: Record<"multipla" | "objetiva", string> = {
  multipla:
    "Crie 3 questoes de MULTIPLA ESCOLHA de Matematica do 6o ano com base APENAS no " +
    "conteudo fornecido. Cada questao tem 4 alternativas (A, B, C, D), apenas uma correta. " +
    "Nao revele as respostas junto das questoes. Ao final, em uma secao separada chamada " +
    "'GABARITO', indique a alternativa correta de cada questao com uma breve explicacao " +
    "(feedback) que ajude o aluno a entender o porque.",
  objetiva:
    "Crie 3 questoes OBJETIVAS (problemas curtos para o aluno resolver) de Matematica do 6o " +
    "ano com base APENAS no conteudo fornecido. Nao de a resposta junto das questoes. Ao " +
    "final, em uma secao 'GABARITO', apresente a resolucao passo a passo de cada questao " +
    "como feedback.",
};

export interface Dependencias {
  embeddings: ProvedorEmbeddings;
  llm: ProvedorLlm;
  repositorio: RepositorioTrechos;
}

export interface ResultadoTutor {
  recusado: boolean;
  motivo?: string;
  resposta?: string;
  opcoes?: string[];
  tema?: string;
  competenciaBncc?: string;
  fontes: TrechoRecuperado[];
  eventos: EventoGuardrail[];
  telemetria: { melhorScore: number; modelo?: string; tokensEntrada?: number; tokensSaida?: number };
}

function analisarPedidoQuestoes(pergunta: string): { pedido: boolean; formato: "multipla" | "objetiva" | null } {
  const p = normalizar(pergunta);
  const pedido = /(quest(ao|oes)|exercicio|exercicios|treinar|praticar|simulado)/.test(p);
  let formato: "multipla" | "objetiva" | null = null;
  if (/multipla escolha|alternativa/.test(p)) formato = "multipla";
  else if (/objetiv|aberta|resolver|dissertativ/.test(p)) formato = "objetiva";
  return { pedido, formato };
}

function montarPrompt(regras: string, pergunta: string, trechos: TrechoRecuperado[]): string {
  const contexto = trechos
    .map((t) => `[${(t.metadados as any).codigo_bncc ?? ""}] ${(t.metadados as any).titulo ?? ""}: ${t.texto}`)
    .join("\n");
  return `### REGRAS\n${regras}\n\n### CONTEUDO DO MATERIAL (fonte)\n${contexto}\n\n### PEDIDO DO ALUNO\n${pergunta}\n`;
}

export async function responder(
  escolaId: string,
  pergunta: string,
  dep: Dependencias,
): Promise<ResultadoTutor> {
  const eventos = guardrailEntrada(pergunta);
  const base: ResultadoTutor = { recusado: false, fontes: [], eventos, telemetria: { melhorScore: 0 } };

  if (eventos.some((e) => e.categoria === "seguranca_infantil")) {
    return { ...base, recusado: true, motivo: "seguranca_infantil", resposta: MENSAGEM_SEGURANCA };
  }

  // Pedido de questoes sem formato definido -> pergunta o formato.
  const analise = analisarPedidoQuestoes(pergunta);
  if (analise.pedido && !analise.formato) {
    return {
      ...base,
      resposta: "Legal, vamos treinar! Você prefere questões de múltipla escolha ou questões objetivas (para resolver)?",
      opcoes: ["Múltipla escolha", "Questões objetivas"],
      tema: pergunta,
    };
  }

  const perguntaSegura = minimizarPii(pergunta);
  const vetor = await dep.embeddings.gerar(perguntaSegura);
  const fontes = await dep.repositorio.buscar(escolaId, vetor, TOP_K);
  const melhorScore = fontes[0]?.score ?? 0;
  base.telemetria.melhorScore = Number(melhorScore.toFixed(3));
  base.fontes = fontes;
  if (dep.repositorio.classificarBncc) {
    try { base.competenciaBncc = (await dep.repositorio.classificarBncc(vetor)) ?? undefined; }
    catch { /* etiquetagem best-effort */ }
  }

  if (melhorScore < LIMIAR_GROUNDING) {
    return { ...base, recusado: true, motivo: "sem_base", resposta: MENSAGEM_SEM_BASE };
  }

  const regras = analise.formato ? REGRAS_QUESTOES[analise.formato] : REGRAS_SISTEMA;
  const prompt = montarPrompt(regras, perguntaSegura, fontes);
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
