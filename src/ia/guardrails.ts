// Guardrails minimos do MVP. Prioridade: seguranca do aluno.
// Entrada: minimizacao de PII, injection, triagem de seguranca infantil.
// Saida: veto a conteudo impróprio e a linguagem punitiva (Lei 13.010).

import { normalizar } from "./texto";

export interface EventoGuardrail {
  categoria: "pii" | "off_topic" | "seguranca_infantil" | "injection" | "toxicidade";
  acao: "bloqueado" | "reescrito" | "alerta";
  detalhe: string;
}

const PADRAO_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PADRAO_INJECTION = ["ignore as instrucoes", "esqueca as regras", "aja como"];
const TERMOS_SEGURANCA = ["me machucar", "suicidio", "me matar", "apanhar em casa"];

export function guardrailEntrada(pergunta: string): EventoGuardrail[] {
  const eventos: EventoGuardrail[] = [];
  const p = normalizar(pergunta);

  if (PADRAO_EMAIL.test(pergunta)) {
    eventos.push({ categoria: "pii", acao: "bloqueado", detalhe: "email na mensagem" });
  }
  if (PADRAO_INJECTION.some((termo) => p.includes(termo))) {
    eventos.push({ categoria: "injection", acao: "alerta", detalhe: "tentativa de burlar regras" });
  }
  if (TERMOS_SEGURANCA.some((termo) => p.includes(termo))) {
    eventos.push({ categoria: "seguranca_infantil", acao: "bloqueado", detalhe: "possivel risco ao aluno" });
  }
  return eventos;
}

// Placeholder de moderacao de saida. Em producao, plugar moderacao do provedor.
export function guardrailSaida(resposta: string): { texto: string; eventos: EventoGuardrail[] } {
  const eventos: EventoGuardrail[] = [];
  return { texto: resposta, eventos };
}
