// Guardrails do tutor. Prioridade: seguranca do aluno (publico infantil).
// Entrada: PII, injection, seguranca infantil. Saida: moderacao e anti-PII.
import { normalizar } from "./texto";

export interface EventoGuardrail {
  categoria: "pii" | "off_topic" | "seguranca_infantil" | "injection" | "toxicidade";
  acao: "bloqueado" | "reescrito" | "alerta";
  severidade: "baixa" | "media" | "alta";
  detalhe: string;
}

// Deteccao (sem flag global, para .test() ser estavel)
const TEM_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const TEM_TELEFONE = /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}\b/;
const TEM_CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;

const PADRAO_INJECTION = ["ignore as instrucoes", "esqueca as regras", "aja como", "desconsidere", "voce agora e"];
const TERMOS_SEGURANCA = ["me machucar", "suicid", "me matar", "apanhar em casa", "me bater", "abuso", "me tocar", "nao aguento mais viver", "acabar com tudo"];

export function guardrailEntrada(pergunta: string): EventoGuardrail[] {
  const eventos: EventoGuardrail[] = [];
  const p = normalizar(pergunta);

  if (TEM_EMAIL.test(pergunta) || TEM_TELEFONE.test(pergunta) || TEM_CPF.test(pergunta)) {
    eventos.push({ categoria: "pii", acao: "reescrito", severidade: "media", detalhe: "dado pessoal removido antes do envio ao modelo" });
  }
  if (PADRAO_INJECTION.some((t) => p.includes(t))) {
    eventos.push({ categoria: "injection", acao: "alerta", severidade: "media", detalhe: "possivel tentativa de burlar as regras" });
  }
  if (TERMOS_SEGURANCA.some((t) => p.includes(t))) {
    eventos.push({ categoria: "seguranca_infantil", acao: "bloqueado", severidade: "alta", detalhe: "possivel sinal de risco ao aluno" });
  }
  return eventos;
}

// Remove/mascara dados pessoais antes de enviar ao LLM (minimizacao LGPD).
export function minimizarPii(texto: string): string {
  return texto
    .replace(new RegExp(TEM_EMAIL.source, "g"), "[email]")
    .replace(new RegExp(TEM_CPF.source, "g"), "[documento]")
    .replace(new RegExp(TEM_TELEFONE.source, "g"), "[telefone]");
}

// Moderacao de saida: nao deixa vazar PII na resposta.
export function guardrailSaida(resposta: string): { texto: string; eventos: EventoGuardrail[] } {
  const eventos: EventoGuardrail[] = [];
  let texto = resposta;
  if (TEM_EMAIL.test(resposta) || TEM_TELEFONE.test(resposta) || TEM_CPF.test(resposta)) {
    texto = minimizarPii(resposta);
    eventos.push({ categoria: "pii", acao: "reescrito", severidade: "media", detalhe: "dado pessoal removido da resposta" });
  }
  return { texto, eventos };
}

export const MENSAGEM_SEGURANCA =
  "Percebi que você pode estar passando por algo difícil, e isso é muito importante. " +
  "Eu sou só um tutor de matemática e não sou a pessoa certa para ajudar com isso. " +
  "Procure agora um adulto de confiança — um responsável, o seu professor ou a coordenação da escola. Você não está sozinho.";

export const MENSAGEM_SEM_BASE =
  "Não encontrei isso no material da sua turma. Vale conversar com o seu professor sobre esse tema.";
