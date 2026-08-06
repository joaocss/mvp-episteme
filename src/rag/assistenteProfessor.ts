// Assistente de IA do PROFESSOR: responde a partir dos documentos cuja audiencia
// inclui 'professor' ou 'escola' (regimento, orientacoes pedagogicas, avisos da
// gestao). Diferente do tutor (que ensina a crianca a pensar), aqui e um
// assistente profissional: objetivo e direto, ancorado nos documentos da escola.
// Nao inclui o ramo de "conteudo escolar" (incluirConteudo=false): so audiencia.
import { ProvedorEmbeddings, ProvedorLlm, RepositorioTrechos, TrechoRecuperado, FiltroConteudo } from "../ia/tipos";
import { guardrailEntrada, guardrailSaida, minimizarPii, EventoGuardrail, MENSAGEM_SEGURANCA } from "../ia/guardrails";
import { LIMIAR_GROUNDING } from "./tutor";

const TOP_K = 4;

export interface DependenciasAssistente {
  embeddings: ProvedorEmbeddings;
  llm: ProvedorLlm;
  repositorio: RepositorioTrechos;
}

export interface ResultadoAssistente {
  recusado: boolean;
  motivo?: string;
  resposta?: string;
  fontes: TrechoRecuperado[];
  eventos: EventoGuardrail[];
  telemetria: { melhorScore: number; modelo?: string; tokensEntrada?: number; tokensSaida?: number };
}

const MENSAGEM_SEM_DOC =
  "Nao encontrei essa informacao nos documentos disponibilizados para os professores. " +
  "Se for um documento novo, peca ao diretor para inclui-lo, ou fale com a coordenacao.";

const REGRAS =
  "Voce e um assistente profissional para a equipe da escola (professores e gestao). " +
  "Responda de forma objetiva, cordial e pratica, SEMPRE com base APENAS nos DOCUMENTOS " +
  "fornecidos (regimento, orientacoes, avisos). Cite de que trata o documento quando ajudar. " +
  "Nao invente regras nem informacoes que nao estejam nos documentos. Use markdown quando " +
  "ajudar (listas, negrito). Se a pergunta fugir do que os documentos cobrem, diga isso com " +
  "clareza e sugira procurar a coordenacao.";

function contexto(trechos: TrechoRecuperado[]): string {
  return trechos.map((t) => `- ${(t.metadados as any).titulo ?? ""}: ${t.texto}`).join("\n");
}

// papelAudiencia: qual audiencia consultar ('professor' ou 'gestor'). Ambos veem
// tambem os documentos de audiencia 'escola'.
export async function responderAssistente(
  escolaId: string,
  pergunta: string,
  dep: DependenciasAssistente,
  papelAudiencia: "professor" | "gestor" = "professor",
): Promise<ResultadoAssistente> {
  const eventos = guardrailEntrada(pergunta);
  const base: ResultadoAssistente = { recusado: false, fontes: [], eventos, telemetria: { melhorScore: 0 } };
  if (eventos.some((e) => e.categoria === "seguranca_infantil")) {
    return { ...base, recusado: true, motivo: "seguranca_infantil", resposta: MENSAGEM_SEGURANCA };
  }

  const perguntaSegura = minimizarPii(pergunta);
  const vetor = await dep.embeddings.gerar(perguntaSegura);
  // So audiencia (papel/escola); NAO inclui o conteudo escolar por disciplina/ano.
  const filtro: FiltroConteudo = { papel: papelAudiencia, incluirConteudo: false };
  const fontes = await dep.repositorio.buscar(escolaId, vetor, TOP_K, filtro);
  base.fontes = fontes;
  base.telemetria.melhorScore = Number((fontes[0]?.score ?? 0).toFixed(3));

  if ((fontes[0]?.score ?? 0) < LIMIAR_GROUNDING) {
    return { ...base, recusado: true, motivo: "sem_documento", resposta: MENSAGEM_SEM_DOC };
  }

  const prompt =
    `### REGRAS\n${REGRAS}\n\n### DOCUMENTOS DA ESCOLA (fonte)\n${contexto(fontes)}\n\n### PERGUNTA\n${perguntaSegura}\n`;
  const saidaLlm = await dep.llm.gerar(prompt, { maxTokens: 900 });
  const saida = guardrailSaida(saidaLlm.texto);

  return {
    ...base,
    resposta: saida.texto,
    eventos: [...eventos, ...saida.eventos],
    telemetria: {
      melhorScore: base.telemetria.melhorScore,
      modelo: saidaLlm.modelo, tokensEntrada: saidaLlm.tokensEntrada, tokensSaida: saidaLlm.tokensSaida,
    },
  };
}
