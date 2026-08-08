// Pipeline do tutor: guardrail -> (PII) -> embedding -> busca em camadas
// (livro -> BNCC -> conhecimento geral) -> prompt -> LLM -> guardrail de
// saida. Inclui modo "questoes de treino".
import { ProvedorEmbeddings, ProvedorLlm, RepositorioTrechos, TrechoRecuperado, TrechoBncc, FiltroConteudo } from "../ia/tipos";
import { normalizar } from "../ia/texto";
import {
  guardrailEntrada, guardrailSaida, minimizarPii, EventoGuardrail,
  MENSAGEM_SEGURANCA, MENSAGEM_SEM_BASE,
} from "../ia/guardrails";

// Limiar de grounding no LIVRO da escola. Usado tambem pelo modulo de Provas
// (src/rag/provas.ts), que continua estritamente livro-only (nao usa BNCC nem
// conhecimento geral como fallback: gerar/corrigir prova precisa de fonte certa).
export const LIMIAR_GROUNDING = 0.12;
// Limiar de grounding na BNCC (2a camada, so no chat livre do tutor).
export const LIMIAR_BNCC = 0.15;
const TOP_K = 3;

// Fase 7 (multi-serie/multi-disciplina): rotulos amigaveis para o prompt e
// para a UI. "disciplina" e sempre o slug sem acento gravado no banco
// (materiais_fonte.disciplina, provas.disciplina, sessoes_tutor.disciplina).
// Rotulos "bonitos" conhecidos; qualquer outra disciplina (ex.: de curso tecnico
// ou superior) cai no fallback que capitaliza o slug — nada fica preso a
// matematica/6o ano. O nome amigavel real vem do catalogo `disciplinas` por
// escola; este mapa e so um verniz para os slugs historicos.
export const ROTULO_DISCIPLINA: Record<string, string> = {
  matematica: "Matemática",
  portugues: "Língua Portuguesa",
  historia: "História",
  geral: "Conteúdo geral",
};
export function rotuloDisciplina(disciplina: string): string {
  if (ROTULO_DISCIPLINA[disciplina]) return ROTULO_DISCIPLINA[disciplina];
  // Fallback generico: "tecnico_administrativo" -> "Tecnico Administrativo".
  return (disciplina || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || disciplina;
}

// Instrucao para a IA "ilustrar" pedindo DIAGRAMAS deterministicos que o app
// desenha (DiagramaEpisteme). O modelo nao gera imagem (erraria matematica):
// so descreve o que ilustrar num bloco ```viz {json}```.
export const INSTRUCAO_VISUAL =
  "APOIO VISUAL: quando um desenho ajudar a entender (sobretudo em matematica e " +
  "para series iniciais), inclua no meio da explicacao um DIAGRAMA, escrevendo um " +
  "bloco de codigo com a linguagem `viz` e um JSON valido (aspas duplas). Tipos:\n" +
  '- Reta numerica: ```viz\\n{"tipo":"reta_numerica","de":0,"ate":10,"marcar":[3],"titulo":"..."}\\n```\n' +
  '- Fracao: ```viz\\n{"tipo":"fracao","numerador":1,"denominador":2,"forma":"barra","titulo":"..."}\\n``` (forma: "barra" ou "pizza")\n' +
  '- Agrupamento (contar/multiplicar/dividir): ```viz\\n{"tipo":"grupos","total":12,"porGrupo":3,"emoji":"🍎"}\\n```\n' +
  '- Barras: ```viz\\n{"tipo":"barras","dados":[{"rotulo":"A","valor":3}],"titulo":"..."}\\n```\n' +
  "Use no maximo 1 ou 2 diagramas por resposta, so quando ajudarem de verdade. Nao " +
  "comente o bloco viz em si — apenas insira-o onde o desenho faz sentido.";

// Parceira cognitiva (alinhado ao ensaio sobre regressao cognitiva): o tutor e o
// ANDAIME, nao a muleta. Faz o aluno pensar, da pistas antes da resposta, e apoia
// com exemplos, analogias do cotidiano e ilustracoes — adequando a linguagem a
// serie (quanto menor a serie, mais concreto e mais apoio visual).
function regrasSistema(disciplina: string, ano: string): string {
  const materia = rotuloDisciplina(disciplina);
  return (
    `Voce e um tutor de ${materia} do ${ano} e atua como PARCEIRA COGNITIVA — um ANDAIME ` +
    "que sustenta o aluno enquanto ele constroi o proprio entendimento, NUNCA uma muleta " +
    "que pensa por ele. Principios:\n" +
    `1. LINGUAGEM E EXEMPLOS pela serie: adeque tudo a idade de um aluno do ${ano}; quanto ` +
    "menor a serie, mais concreto, mais devagar e mais apoio visual.\n" +
    "2. SEMPRE traga pelo menos UM exemplo concreto e UMA analogia do dia a dia da crianca " +
    "(comida, brincadeiras, dinheiro, objetos da sala) para dar sentido a ideia.\n" +
    "3. Explique em PASSO A PASSO numerado, um raciocinio por vez, em markdown (negrito nos " +
    "termos-chave, listas, formulas entre crases quando ajudar).\n" +
    "4. Antes da resposta pronta, incentive o aluno a tentar e ofereca pistas; conduza com " +
    "perguntas. NUNCA entregue apenas a resposta final de uma tarefa avaliativa.\n" +
    "5. Jamais use linguagem punitiva ou humilhante. Ao final, convide o aluno a continuar " +
    "('Ficou alguma parte confusa? Pode perguntar de novo.').\n\n" +
    INSTRUCAO_VISUAL
  );
}

// Complemento quando ha conteudo do LIVRO da escola: usar so o que foi fornecido.
const REGRA_FONTE_LIVRO =
  "Use o CONTEUDO DO MATERIAL (fonte) como base principal da resposta; nao invente " +
  "nada que contradiga o livro da escola.";

// Complemento quando so ha a BNCC (sem trecho do livro): a resposta pode ir alem
// da habilidade descrita, mas deve deixar isso explicito.
const REGRA_FONTE_BNCC =
  "O livro da escola nao tem um trecho especifico sobre esse assunto, mas ele esta " +
  "dentro da habilidade da BNCC listada em CONTEUDO DO MATERIAL (fonte). Explique com " +
  "base nessa habilidade. Comece a resposta com uma linha curta avisando que essa " +
  "duvida nao esta no livro da turma, mas faz parte do que a BNCC espera para o ano, " +
  "e que vale conferir com o professor.";

// Complemento quando NEM o livro NEM a BNCC tem algo relacionado: conhecimento geral.
function regraFonteGeral(disciplina: string, ano: string): string {
  return (
    "Nao ha trecho do livro da escola nem habilidade da BNCC relacionados a essa duvida. " +
    `Responda mesmo assim, com seu conhecimento geral de ${rotuloDisciplina(disciplina)} do ${ano}, mas ` +
    "comece a resposta com uma linha curta avisando que isso nao esta no material " +
    "oficial da escola e sugerindo confirmar com o professor."
  );
}

// Complemento quando o aluno envia uma foto/imagem junto da pergunta (Fase 6:
// tutor multimodal) e nem o livro nem a BNCC tem um trecho especifico: a foto
// enviada pelo aluno vira a fonte principal.
const REGRA_FONTE_IMAGEM =
  "O aluno enviou uma foto/imagem junto com a pergunta. Observe a imagem com atencao " +
  "e use-a como base principal da explicacao, mesmo que o livro da escola nao tenha um " +
  "trecho especifico sobre esse conteudo. Comece a resposta com uma linha curta avisando " +
  "que a explicacao e baseada na imagem enviada, nao no material oficial da escola.";

function regrasQuestoes(disciplina: string, ano: string): Record<"multipla" | "objetiva", string> {
  const materia = rotuloDisciplina(disciplina);
  return {
    multipla:
      `Crie 3 questoes de MULTIPLA ESCOLHA de ${materia} do ${ano} com base APENAS no ` +
      "conteudo fornecido. Cada questao tem 4 alternativas (A, B, C, D), apenas uma correta. " +
      "Nao revele as respostas junto das questoes. Ao final, em uma secao separada chamada " +
      "'GABARITO', indique a alternativa correta de cada questao com uma breve explicacao " +
      "(feedback) que ajude o aluno a entender o porque.",
    objetiva:
      `Crie 3 questoes OBJETIVAS (problemas curtos para o aluno resolver) de ${materia} do ${ano} ` +
      "com base APENAS no conteudo fornecido. Nao de a resposta junto das questoes. Ao " +
      "final, em uma secao 'GABARITO', apresente a resolucao passo a passo de cada questao " +
      "como feedback.",
  };
}

export interface Dependencias {
  embeddings: ProvedorEmbeddings;
  llm: ProvedorLlm;
  repositorio: RepositorioTrechos;
}

export type OrigemResposta = "livro" | "bncc" | "conhecimento_geral" | "imagem";

export interface ResultadoTutor {
  recusado: boolean;
  motivo?: string;
  resposta?: string;
  opcoes?: string[];
  tema?: string;
  competenciaBncc?: string;
  origemResposta?: OrigemResposta;
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

export interface TurnoHistorico { autor: "aluno" | "ia"; conteudo: string }

function contextoDoLivro(trechos: TrechoRecuperado[]): string {
  return trechos
    .map((t) => `[${(t.metadados as any).codigo_bncc ?? ""}] ${(t.metadados as any).titulo ?? ""}: ${t.texto}`)
    .join("\n");
}

function contextoDaBncc(trechos: TrechoBncc[]): string {
  return trechos.map((t) => `[${t.codigo}] ${t.unidadeTematica ?? ""}: ${t.descricao}`).join("\n");
}

function montarPrompt(
  regras: string, regraFonte: string, pergunta: string, contexto: string, historico: TurnoHistorico[],
): string {
  const conversaAnterior = historico.length
    ? `### CONVERSA ANTERIOR (contexto, nao repita nem resuma)\n${historico
        .map((h) => `${h.autor === "aluno" ? "Aluno" : "Tutor"}: ${h.conteudo}`)
        .join("\n")}\n\n`
    : "";
  const blocoContexto = contexto
    ? `### CONTEUDO DO MATERIAL (fonte)\n${contexto}\n\n`
    : "";
  return `### REGRAS\n${regras}\n\n${regraFonte}\n\n${blocoContexto}${conversaAnterior}### PEDIDO DO ALUNO\n${pergunta}\n`;
}

// Escopo por turma: quando a turma do aluno tem material proprio vinculado,
// turmaId restringe a busca no livro aos materiais daquela turma. modoEstrito
// (configuravel por turma) bloqueia o fallback BNCC/conhecimento geral: se nao
// achar no material da turma, o tutor recusa em vez de responder por fora.
export interface OpcoesTurma { turmaId?: string; modoEstrito?: boolean }

// Preparacao da resposta: ou ja e um resultado TERMINAL (recusa, pedido de
// formato de questoes), ou traz tudo que falta para GERAR (prompt + metadados).
// Separar isto da geracao permite fazer streaming do LLM sem duplicar o
// pipeline (embed -> busca -> decisao de camada -> prompt).
export type Preparacao =
  | { modo: "terminal"; resultado: ResultadoTutor }
  | {
      modo: "gerar";
      prompt: string;
      maxTokens: number;
      imagemBase64?: string;
      origemResposta: OrigemResposta;
      base: ResultadoTutor;
    };

export async function prepararResposta(
  escolaId: string,
  pergunta: string,
  dep: Dependencias,
  historico: TurnoHistorico[] = [],
  imagemBase64?: string,
  disciplina = "matematica",
  ano = "6o ano",
  opcoes: OpcoesTurma = {},
): Promise<Preparacao> {
  // papel 'aluno': alem do conteudo da turma, a busca inclui docs de audiencia
  // 'aluno' e 'escola' (ex.: regimento visivel a todos).
  const filtro: FiltroConteudo = { disciplina, ano, turmaId: opcoes.turmaId, papel: "aluno" };
  const eventos = guardrailEntrada(pergunta);
  const base: ResultadoTutor = { recusado: false, fontes: [], eventos, telemetria: { melhorScore: 0 } };

  if (eventos.some((e) => e.categoria === "seguranca_infantil")) {
    return { modo: "terminal", resultado: { ...base, recusado: true, motivo: "seguranca_infantil", resposta: MENSAGEM_SEGURANCA } };
  }

  // Pedido de questoes sem formato definido -> pergunta o formato.
  const analise = analisarPedidoQuestoes(pergunta);
  if (analise.pedido && !analise.formato) {
    return {
      modo: "terminal",
      resultado: {
        ...base,
        resposta: "Legal, vamos treinar! Você prefere questões de múltipla escolha ou questões objetivas (para resolver)?",
        opcoes: ["Múltipla escolha", "Questões objetivas"],
        tema: pergunta,
      },
    };
  }

  const perguntaSegura = minimizarPii(pergunta);
  const vetor = await dep.embeddings.gerar(perguntaSegura);
  const fontes = await dep.repositorio.buscar(escolaId, vetor, TOP_K, filtro);
  const melhorScore = fontes[0]?.score ?? 0;
  base.telemetria.melhorScore = Number(melhorScore.toFixed(3));
  base.fontes = fontes;
  if (dep.repositorio.classificarBncc) {
    try { base.competenciaBncc = (await dep.repositorio.classificarBncc(vetor, filtro)) ?? undefined; }
    catch { /* etiquetagem best-effort */ }
  }

  // Pedido de questoes de treino: mantem grounding estrito no livro (nunca
  // inventa exercicio sem fonte). Chat livre segue para as camadas BNCC/geral.
  if (analise.formato) {
    if (melhorScore < LIMIAR_GROUNDING) {
      return { modo: "terminal", resultado: { ...base, recusado: true, motivo: "sem_base", resposta: MENSAGEM_SEM_BASE } };
    }
    const prompt = montarPrompt(
      regrasQuestoes(disciplina, ano)[analise.formato], REGRA_FONTE_LIVRO, perguntaSegura, contextoDoLivro(fontes), historico,
    );
    return { modo: "gerar", prompt, maxTokens: 1200, origemResposta: "livro", base };
  }

  // Chat livre: camada 1 (livro) -> camada 2 (BNCC) -> camada 3 (conhecimento geral).
  let contexto = "";
  let regraFonte = REGRA_FONTE_LIVRO;
  let origemResposta: OrigemResposta = "livro";

  if (melhorScore >= LIMIAR_GROUNDING) {
    contexto = contextoDoLivro(fontes);
  } else if (opcoes.modoEstrito) {
    // Modo estrito da turma: sem trecho no material da turma, recusa (nao usa
    // BNCC nem conhecimento geral). Guardrail de pertinencia por turma.
    return { modo: "terminal", resultado: { ...base, recusado: true, motivo: "fora_conteudo_turma", resposta: MENSAGEM_SEM_BASE } };
  } else {
    let trechosBncc: TrechoBncc[] = [];
    if (dep.repositorio.buscarBncc) {
      try { trechosBncc = await dep.repositorio.buscarBncc(vetor, TOP_K, filtro); } catch { /* fallback best-effort */ }
    }
    const melhorBncc = trechosBncc[0]?.score ?? 0;
    if (melhorBncc >= LIMIAR_BNCC) {
      contexto = contextoDaBncc(trechosBncc);
      regraFonte = REGRA_FONTE_BNCC;
      origemResposta = "bncc";
    } else if (imagemBase64) {
      // Nem livro nem BNCC, mas o aluno mandou uma foto: ela vira a fonte.
      regraFonte = REGRA_FONTE_IMAGEM;
      origemResposta = "imagem";
    } else {
      regraFonte = regraFonteGeral(disciplina, ano);
      origemResposta = "conhecimento_geral";
    }
  }

  const prompt = montarPrompt(regrasSistema(disciplina, ano), regraFonte, perguntaSegura, contexto, historico);
  return { modo: "gerar", prompt, maxTokens: 1200, imagemBase64, origemResposta, base };
}

// Monta o ResultadoTutor final a partir do texto gerado pelo LLM (aplica o
// guardrail de saida). Usado tanto pela geracao de uma vez (responder) quanto
// pela geracao em streaming (rota /api/tutor).
export function montarResultado(
  prep: Extract<Preparacao, { modo: "gerar" }>,
  saidaLlm: { texto: string; modelo?: string; tokensEntrada?: number; tokensSaida?: number },
): ResultadoTutor {
  const saida = guardrailSaida(saidaLlm.texto);
  return {
    ...prep.base,
    resposta: saida.texto,
    origemResposta: prep.origemResposta,
    eventos: [...prep.base.eventos, ...saida.eventos],
    telemetria: {
      melhorScore: prep.base.telemetria.melhorScore,
      modelo: saidaLlm.modelo,
      tokensEntrada: saidaLlm.tokensEntrada,
      tokensSaida: saidaLlm.tokensSaida,
    },
  };
}

export async function responder(
  escolaId: string,
  pergunta: string,
  dep: Dependencias,
  historico: TurnoHistorico[] = [],
  imagemBase64?: string,
  disciplina = "matematica",
  ano = "6o ano",
  opcoes: OpcoesTurma = {},
): Promise<ResultadoTutor> {
  const prep = await prepararResposta(escolaId, pergunta, dep, historico, imagemBase64, disciplina, ano, opcoes);
  if (prep.modo === "terminal") return prep.resultado;
  const saidaLlm = await dep.llm.gerar(prep.prompt, { maxTokens: prep.maxTokens, imagemBase64: prep.imagemBase64 });
  return montarResultado(prep, saidaLlm);
}
