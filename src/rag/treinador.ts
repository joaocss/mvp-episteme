// Pipeline do Modo Treinador (dever de casa anti-muleta). Diferente do tutor, o
// treinador NUNCA entrega a resposta: ele reconhece a tentativa do aluno, faz UMA
// pergunta orientadora ou da UMA pista pequena, e o ajuda a dar o proximo passo
// sozinho. As pistas se ancoram no material da turma quando ha grounding, mas o
// foco e o PROCESSO (nao um fato do livro), entao a falta de trecho nao recusa:
// o coach cai numa pista de raciocinio generica.
import { ProvedorEmbeddings, ProvedorLlm, RepositorioTrechos, TrechoRecuperado, FiltroConteudo } from "../ia/tipos";
import { guardrailEntrada, guardrailSaida, minimizarPii, EventoGuardrail, MENSAGEM_SEGURANCA } from "../ia/guardrails";
import { LIMIAR_GROUNDING, rotuloDisciplina, type TurnoHistorico, type OpcoesTurma } from "./tutor";

const TOP_K = 3;

export interface DependenciasTreinador {
  embeddings: ProvedorEmbeddings;
  llm: ProvedorLlm;
  repositorio: RepositorioTrechos;
}

export interface ResultadoTreinador {
  recusado: boolean;
  motivo?: string;
  pista?: string;
  fontes: TrechoRecuperado[];
  eventos: EventoGuardrail[];
  telemetria: { melhorScore: number; modelo?: string; tokensEntrada?: number; tokensSaida?: number };
}

// Regras do coach: o coracao do modo treinador. Retem a resposta a todo custo.
function regrasTreinador(disciplina: string, ano: string): string {
  const materia = rotuloDisciplina(disciplina);
  return (
    `Voce e um TREINADOR (coach) de ${materia} do ${ano}. O aluno esta resolvendo um DESAFIO ` +
    "de casa e voce o acompanha. Sua funcao NUNCA e dar a resposta final, o resultado, nem " +
    "resolver o exercicio por ele — nem que ele peca, insista ou diga que desistiu. Em vez disso:\n" +
    "1. Reconheca de forma breve a tentativa ou o ponto onde o aluno esta.\n" +
    "2. Faca UMA pergunta orientadora OU de UMA pista pequena que o ajude a dar o PROXIMO passo sozinho.\n" +
    "3. Se ele errou, nao revele a resposta certa: aponte com gentileza onde vale revisar e pergunte como ele chegou ali.\n" +
    "4. Se ele ja parece ter chegado ao resultado, peca que explique o raciocinio com as proprias palavras — nao confirme entregando a solucao.\n" +
    "Seja breve (2 a 4 frases), caloroso e encorajador, nunca punitivo. Uma pista por vez. " +
    "Se houver CONTEUDO DO MATERIAL, baseie a pista nele. Nunca escreva a solucao completa nem o valor/resposta final."
  );
}

function montarPromptTreinador(
  regras: string, enunciado: string, objetivo: string | null,
  contexto: string, historico: TurnoHistorico[], mensagemAluno: string,
): string {
  const conversa = historico.length
    ? `### PROCESSO ATE AGORA (nao repita, so continue)\n${historico
        .map((h) => `${h.autor === "aluno" ? "Aluno" : "Treinador"}: ${h.conteudo}`).join("\n")}\n\n`
    : "";
  const blocoObjetivo = objetivo ? `Objetivo de aprendizagem: ${objetivo}\n` : "";
  const blocoContexto = contexto ? `### CONTEUDO DO MATERIAL (base para as pistas)\n${contexto}\n\n` : "";
  return (
    `### REGRAS\n${regras}\n\n` +
    `### DESAFIO DO ALUNO\n${enunciado}\n${blocoObjetivo}\n` +
    `${blocoContexto}${conversa}### MENSAGEM ATUAL DO ALUNO\n${mensagemAluno}\n`
  );
}

function contextoDoLivro(trechos: TrechoRecuperado[]): string {
  return trechos
    .map((t) => `${(t.metadados as any).titulo ?? ""}: ${t.texto}`)
    .join("\n");
}

export async function orientar(
  escolaId: string,
  treino: { enunciado: string; objetivo: string | null; disciplina: string },
  mensagemAluno: string,
  dep: DependenciasTreinador,
  historico: TurnoHistorico[] = [],
  ano = "6o ano",
  opcoes: OpcoesTurma = {},
): Promise<ResultadoTreinador> {
  const eventos = guardrailEntrada(mensagemAluno);
  const base: ResultadoTreinador = { recusado: false, fontes: [], eventos, telemetria: { melhorScore: 0 } };

  if (eventos.some((e) => e.categoria === "seguranca_infantil")) {
    return { ...base, recusado: true, motivo: "seguranca_infantil", pista: MENSAGEM_SEGURANCA };
  }

  const filtro: FiltroConteudo = { disciplina: treino.disciplina, ano, turmaId: opcoes.turmaId };
  const mensagemSegura = minimizarPii(mensagemAluno);

  // Grounding e opcional aqui: ancora a pista no material quando existe, mas a
  // ausencia de trecho NAO recusa (o foco e o processo, nao um fato do livro).
  let contexto = "";
  try {
    const vetor = await dep.embeddings.gerar(`${treino.enunciado}\n${mensagemSegura}`);
    const fontes = await dep.repositorio.buscar(escolaId, vetor, TOP_K, filtro);
    base.fontes = fontes;
    base.telemetria.melhorScore = Number((fontes[0]?.score ?? 0).toFixed(3));
    if ((fontes[0]?.score ?? 0) >= LIMIAR_GROUNDING) contexto = contextoDoLivro(fontes);
  } catch { /* grounding best-effort: sem material, pista de raciocinio generica */ }

  const prompt = montarPromptTreinador(
    regrasTreinador(treino.disciplina, ano), treino.enunciado, treino.objetivo, contexto, historico, mensagemSegura,
  );
  const saidaLlm = await dep.llm.gerar(prompt, { maxTokens: 400 });
  const saida = guardrailSaida(saidaLlm.texto);

  return {
    ...base,
    pista: saida.texto,
    eventos: [...eventos, ...saida.eventos],
    telemetria: {
      melhorScore: base.telemetria.melhorScore,
      modelo: saidaLlm.modelo,
      tokensEntrada: saidaLlm.tokensEntrada,
      tokensSaida: saidaLlm.tokensSaida,
    },
  };
}
