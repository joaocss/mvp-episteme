// Modulo de Provas: geracao de rascunho via IA (ancorada no RAG do material da
// escola) e os tres feedbacks pedidos pelo aluno (objetiva, passo a passo e
// correcao de dissertativa). Segue o padrao de src/rag/planejamento.ts:
// instancia criarEmbeddings()/criarLlm() diretamente (sem injecao de
// dependencias), pois cada chamada e um uso pontual, nao um pipeline reusado
// em varias invocacoes como o tutor.
import { randomUUID } from "crypto";
import { pool } from "../bd/pool";
import { criarEmbeddings } from "../ia/fabricaEmbeddings";
import { criarLlm } from "../ia/fabricaLlm";
import { RepositorioPostgres } from "./repositorioPostgres";
import { guardrailEntrada, guardrailSaida, MENSAGEM_SEGURANCA, MENSAGEM_SEM_BASE } from "../ia/guardrails";
import { registrarGuardrails } from "./repositorioConversas";
import { LIMIAR_GROUNDING, responder as responderTutor, rotuloDisciplina } from "./tutor";
import { Alternativa, QuestaoParaInserir, TipoQuestao, criarProvaRascunho, inserirQuestoes, salvarFeedbackIa } from "../bd/provas";

export class ErroSemBase extends Error {}

// ------------------------------------------------------------- geracao (IA)

interface QuestaoGerada {
  tipo: TipoQuestao;
  enunciado: string;
  alternativas: Alternativa[] | null;
  gabarito: string;
  explicacao: string | null;
}

// Remove eventuais cercas ```json e isola o array/objeto JSON da resposta do LLM.
export function extrairJson(texto: string): string {
  const semCercas = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
  const inicio = semCercas.search(/[[{]/);
  const fimColchete = semCercas.lastIndexOf("]");
  const fimChave = semCercas.lastIndexOf("}");
  const fim = Math.max(fimColchete, fimChave);
  if (inicio === -1 || fim === -1 || fim < inicio) return semCercas;
  return semCercas.slice(inicio, fim + 1);
}

export function validarQuestao(q: any): QuestaoGerada | null {
  if (!q || typeof q !== "object") return null;
  const tipo: TipoQuestao = q.tipo === "dissertativa" ? "dissertativa" : q.tipo === "objetiva" ? "objetiva" : null as any;
  if (!tipo) return null;
  const enunciado = typeof q.enunciado === "string" ? q.enunciado.trim() : "";
  if (!enunciado) return null;
  const gabaritoBruto = typeof q.gabarito === "string" ? q.gabarito.trim() : "";
  if (!gabaritoBruto) return null;
  const explicacao = typeof q.explicacao === "string" && q.explicacao.trim() ? q.explicacao.trim() : null;

  if (tipo === "objetiva") {
    const alts: Alternativa[] = Array.isArray(q.alternativas)
      ? q.alternativas
          .filter((a: any) => a && typeof a.letra === "string" && typeof a.texto === "string")
          .map((a: any) => ({ letra: a.letra.trim().toUpperCase(), texto: a.texto.trim() }))
      : [];
    if (alts.length !== 4) return null;
    const letraGabarito = gabaritoBruto.toUpperCase().slice(0, 1);
    if (!alts.some((a) => a.letra === letraGabarito)) return null;
    return { tipo, enunciado, alternativas: alts, gabarito: letraGabarito, explicacao };
  }

  return { tipo, enunciado, alternativas: null, gabarito: gabaritoBruto, explicacao };
}

export function parseRascunhoLlm(texto: string): QuestaoGerada[] {
  let bruto: unknown;
  try {
    bruto = JSON.parse(extrairJson(texto));
  } catch {
    return [];
  }
  if (!Array.isArray(bruto)) return [];
  return bruto.map(validarQuestao).filter((q): q is QuestaoGerada => q !== null);
}

export interface DadosGeracaoProva {
  turmaId: string; titulo: string; assunto: string; numeroObjetivas: number; numeroDissertativas: number;
  disciplina: string;
}
export interface QuestaoGeradaResumo { id: string; ordem: number; tipo: TipoQuestao; enunciado: string; }
export interface RascunhoProva { provaId: string; questoes: QuestaoGeradaResumo[]; }

export async function gerarRascunhoProva(
  escolaId: string, professorId: string, dados: DadosGeracaoProva,
): Promise<RascunhoProva> {
  const vinculo = await pool.query(
    `select t.serie
     from professores_turmas pt join turmas t on t.id = pt.turma_id
     where pt.escola_id = $1 and pt.professor_id = $2 and pt.turma_id = $3 and pt.disciplina = $4`,
    [escolaId, professorId, dados.turmaId, dados.disciplina],
  );
  if (!vinculo.rows[0]) throw new Error("Você não leciona essa disciplina nessa turma.");
  const serie: string = vinculo.rows[0].serie;

  const embeddings = criarEmbeddings();
  const repo = new RepositorioPostgres();
  const vetor = await embeddings.gerar(dados.assunto);
  const trechos = await repo.buscar(escolaId, vetor, 8, { disciplina: dados.disciplina, ano: serie });
  const melhorScore = trechos[0]?.score ?? 0;
  if (melhorScore < LIMIAR_GROUNDING) throw new ErroSemBase(MENSAGEM_SEM_BASE);

  const contexto = trechos.map((t) => t.texto).join("\n---\n").slice(0, 6000);
  const materia = rotuloDisciplina(dados.disciplina);

  const prompt =
`Voce e um professor de ${materia} do ${serie}, especialista em elaborar avaliacoes com base no material didatico da escola.

CONTEUDO DO MATERIAL (fonte, use APENAS isto):
${contexto}

TAREFA:
Elabore uma prova sobre "${dados.assunto}" com:
- ${dados.numeroObjetivas} questao(oes) OBJETIVA(S) de multipla escolha (4 alternativas A a D, apenas uma correta)
- ${dados.numeroDissertativas} questao(oes) DISSERTATIVA(S) (o aluno resolve por escrito, sem alternativas)

Responda APENAS com um array JSON valido, sem nenhum texto antes ou depois, no formato exato:
[
  {
    "tipo": "objetiva",
    "enunciado": "...",
    "alternativas": [{"letra":"A","texto":"..."},{"letra":"B","texto":"..."},{"letra":"C","texto":"..."},{"letra":"D","texto":"..."}],
    "gabarito": "B",
    "explicacao": "explicacao didatica, adequada a uma crianca de 11 anos, de por que a alternativa correta esta certa"
  },
  {
    "tipo": "dissertativa",
    "enunciado": "...",
    "alternativas": null,
    "gabarito": "resolucao completa esperada, passo a passo",
    "explicacao": "dica didatica de como abordar o problema"
  }
]

Regras: linguagem simples, adequada a idade do ${serie}; questoes baseadas SOMENTE no material fornecido; no campo "gabarito" das objetivas coloque so a letra (A, B, C ou D); nao inclua texto fora do array JSON.`;

  const resposta = await criarLlm().gerar(prompt, { maxTokens: 4000 });
  const geradas = parseRascunhoLlm(resposta.texto || "");
  if (geradas.length === 0) throw new Error("Não foi possível gerar questões válidas. Tente novamente.");

  const paraInserir: QuestaoParaInserir[] = geradas.map((q, i) => ({
    ordem: i + 1, tipo: q.tipo, enunciado: q.enunciado, alternativas: q.alternativas,
    gabarito: q.gabarito, explicacao: q.explicacao,
  }));

  const provaId = await criarProvaRascunho(
    escolaId, professorId, dados.turmaId, dados.titulo, dados.assunto, paraInserir.length, dados.disciplina,
  );
  await inserirQuestoes(escolaId, provaId, paraInserir);

  return {
    provaId,
    questoes: paraInserir.map((q) => ({ id: "", ordem: q.ordem, tipo: q.tipo, enunciado: q.enunciado })),
  };
}

// -------------------------------------------------------- feedback (aluno)

interface DisciplinaAno { disciplina: string; ano: string; }

async function disciplinaAnoDaQuestao(escolaId: string, questaoId: string): Promise<DisciplinaAno> {
  const r = (await pool.query(
    `select p.disciplina, t.serie as ano
     from questoes q join provas p on p.id = q.prova_id join turmas t on t.id = p.turma_id
     where q.id = $1 and q.escola_id = $2`,
    [questaoId, escolaId],
  )).rows[0];
  return { disciplina: r?.disciplina ?? "matematica", ano: r?.ano ?? "6o ano" };
}

async function buscarContexto(escolaId: string, textoConsulta: string, filtro: DisciplinaAno, limite = 6) {
  const embeddings = criarEmbeddings();
  const repo = new RepositorioPostgres();
  const vetor = await embeddings.gerar(textoConsulta);
  const trechos = await repo.buscar(escolaId, vetor, limite, filtro);
  const melhorScore = trechos[0]?.score ?? 0;
  const contexto = trechos.map((t) => t.texto).join("\n---\n").slice(0, 4000);
  return { melhorScore, contexto };
}

export interface FeedbackQuestao { recusado: boolean; feedback?: string; }

export async function feedbackQuestaoObjetiva(
  escolaId: string, alunoId: string, questaoId: string,
): Promise<FeedbackQuestao> {
  const r = (await pool.query(
    `select r.resposta_aluno, r.correta, r.feedback_ia, q.enunciado, q.gabarito, q.explicacao
     from respostas r join questoes q on q.id = r.questao_id
     where r.questao_id = $2 and r.aluno_id = $3 and r.escola_id = $1`,
    [escolaId, questaoId, alunoId],
  )).rows[0];
  if (!r) throw new Error("Responda a questão antes de pedir feedback.");
  if (r.feedback_ia) return { recusado: false, feedback: r.feedback_ia };

  const da = await disciplinaAnoDaQuestao(escolaId, questaoId);
  const { melhorScore, contexto } = await buscarContexto(escolaId, r.enunciado, da);
  if (melhorScore < LIMIAR_GROUNDING) return { recusado: true, feedback: MENSAGEM_SEM_BASE };

  const prompt =
`### REGRAS
Voce e um tutor de ${rotuloDisciplina(da.disciplina)} do ${da.ano}. Explique de forma didatica e
encorajadora, em linguagem simples e adequada a idade dessa serie, por que a alternativa correta
esta certa e, se o aluno errou, onde o raciocinio dele provavelmente se desviou. Estruture a
explicacao em PASSO A PASSO numerado, em markdown (negrito nos termos-chave, lista numerada). Use
APENAS o material fornecido. Nunca use linguagem punitiva ou humilhante. Termine convidando o
aluno a perguntar de novo, na aba do tutor, se ainda ficou com duvida.

### CONTEUDO DO MATERIAL (fonte)
${contexto}

### QUESTAO
${r.enunciado}

### GABARITO
${r.gabarito}${r.explicacao ? ` — ${r.explicacao}` : ""}

### RESPOSTA DO ALUNO
${r.resposta_aluno} (${r.correta ? "correta" : "incorreta"})

Escreva o feedback diretamente para o aluno.`;

  const saidaLlm = await criarLlm().gerar(prompt, { maxTokens: 900 });
  const saida = guardrailSaida(saidaLlm.texto);
  await salvarFeedbackIa(escolaId, questaoId, alunoId, saida.texto);
  return { recusado: false, feedback: saida.texto };
}

export interface PassoAPasso { recusado: boolean; dica?: string; }

export async function passoAPassoDissertativa(escolaId: string, questaoId: string): Promise<PassoAPasso> {
  const q = (await pool.query(
    `select enunciado, gabarito, explicacao from questoes where id = $1 and escola_id = $2`,
    [questaoId, escolaId],
  )).rows[0];
  if (!q) throw new Error("Questão não encontrada.");

  const da = await disciplinaAnoDaQuestao(escolaId, questaoId);
  const { melhorScore, contexto } = await buscarContexto(escolaId, q.enunciado, da);
  if (melhorScore < LIMIAR_GROUNDING) return { recusado: true, dica: MENSAGEM_SEM_BASE };

  const prompt =
`### REGRAS
Voce e um tutor de ${rotuloDisciplina(da.disciplina)} do ${da.ano} e atua como PARCEIRA COGNITIVA:
faca o aluno PENSAR, nao pense por ele. De APENAS uma dica sobre o PROXIMO PASSO para resolver o
problema. NUNCA revele a resposta final nem a resolucao completa, mesmo que a resolucao
esperada esteja descrita abaixo (ela e so uma referencia interna sua, o aluno nao a ve).
Linguagem simples, adequada a idade dessa serie.

### CONTEUDO DO MATERIAL (fonte)
${contexto}

### QUESTAO
${q.enunciado}

### RESOLUCAO ESPERADA (referencia interna, NAO revelar ao aluno)
${q.gabarito}

Escreva so a dica, diretamente para o aluno.`;

  const saidaLlm = await criarLlm().gerar(prompt, { maxTokens: 300 });
  const saida = guardrailSaida(saidaLlm.texto);
  return { recusado: false, dica: saida.texto };
}

export interface FeedbackDissertativa { recusado: boolean; nota?: number; feedback?: string; }

function parseNotaFeedback(texto: string): { nota: number; feedback: string } | null {
  try {
    const obj = JSON.parse(extrairJson(texto));
    if (typeof obj?.feedback !== "string") return null;
    const nota = Math.max(0, Math.min(10, Number(obj.nota)));
    if (Number.isNaN(nota)) return null;
    return { nota, feedback: obj.feedback.trim() };
  } catch {
    return null;
  }
}

export async function feedbackRespostaDissertativa(
  escolaId: string, alunoId: string, questaoId: string, respostaTexto: string,
): Promise<FeedbackDissertativa> {
  const eventosEntrada = guardrailEntrada(respostaTexto);
  if (eventosEntrada.some((e) => e.categoria === "seguranca_infantil")) {
    await registrarGuardrails(escolaId, null, eventosEntrada, randomUUID()).catch(() => {});
    return { recusado: true, feedback: MENSAGEM_SEGURANCA };
  }

  const cache = (await pool.query(
    `select feedback_ia, nota from respostas where questao_id = $1 and aluno_id = $2 and escola_id = $3`,
    [questaoId, alunoId, escolaId],
  )).rows[0];
  if (cache?.feedback_ia && cache?.nota !== null) {
    return { recusado: false, nota: Number(cache.nota), feedback: cache.feedback_ia };
  }

  const q = (await pool.query(
    `select enunciado, gabarito, explicacao from questoes where id = $1 and escola_id = $2`,
    [questaoId, escolaId],
  )).rows[0];
  if (!q) throw new Error("Questão não encontrada.");

  const da = await disciplinaAnoDaQuestao(escolaId, questaoId);
  const { melhorScore, contexto } = await buscarContexto(escolaId, q.enunciado, da);
  if (melhorScore < LIMIAR_GROUNDING) return { recusado: true, feedback: MENSAGEM_SEM_BASE };

  const prompt =
`### REGRAS
Voce e um tutor de ${rotuloDisciplina(da.disciplina)} do ${da.ano} corrigindo uma questao
dissertativa. Compare a resposta do aluno com a resolucao esperada e de uma nota de 0 a 10.
Escreva um feedback didatico e encorajador (linguagem simples, adequada a idade dessa serie),
estruturado em PASSO A PASSO numerado e em markdown (negrito nos termos-chave), explicando o
que o aluno acertou, o que faltou ou errou, e dicas de possiveis caminhos de solucao. Use
APENAS o material fornecido. Nunca use linguagem punitiva ou humilhante. Termine convidando o
aluno a perguntar de novo, na aba do tutor, se ainda ficou com duvida.

### CONTEUDO DO MATERIAL (fonte)
${contexto}

### QUESTAO
${q.enunciado}

### RESOLUCAO ESPERADA
${q.gabarito}${q.explicacao ? ` — ${q.explicacao}` : ""}

### RESPOSTA DO ALUNO
${respostaTexto}

Responda APENAS com um objeto JSON valido, sem texto antes ou depois, no formato exato:
{"nota": 0, "feedback": "..."}`;

  const saidaLlm = await criarLlm().gerar(prompt, { maxTokens: 900 });
  const parseado = parseNotaFeedback(saidaLlm.texto || "");
  if (!parseado) throw new Error("Não foi possível avaliar a resposta. Tente novamente.");

  const saida = guardrailSaida(parseado.feedback);
  await salvarFeedbackIa(escolaId, questaoId, alunoId, saida.texto, parseado.nota);
  return { recusado: false, nota: parseado.nota, feedback: saida.texto };
}

// ----------------------------------------- duvida de acompanhamento (follow-up)

// Se o aluno nao entendeu o feedback de uma questao, ele pode continuar
// perguntando sobre ela. Reusa o pipeline do tutor (mesmos guardrails e
// cascata livro -> BNCC -> conhecimento geral), passando a questao e o
// feedback ja dado como contexto da conversa.
export interface DuvidaQuestao { recusado: boolean; resposta?: string; origemResposta?: string }

export async function tirarDuvidaSobreQuestao(
  escolaId: string, alunoId: string, questaoId: string, pergunta: string,
): Promise<DuvidaQuestao> {
  const q = (await pool.query(
    `select q.enunciado, q.gabarito, q.explicacao, r.feedback_ia, r.resposta_aluno
     from questoes q
     left join respostas r on r.questao_id = q.id and r.aluno_id = $2
     where q.id = $1 and q.escola_id = $3`,
    [questaoId, alunoId, escolaId],
  )).rows[0];
  if (!q) throw new Error("Questão não encontrada.");
  const da = await disciplinaAnoDaQuestao(escolaId, questaoId);

  const historico = [{
    autor: "ia" as const,
    conteudo: `Questão: ${q.enunciado}\nResposta do aluno: ${q.resposta_aluno ?? "(ainda não respondida)"}\n`
      + `Feedback já dado: ${q.feedback_ia ?? q.explicacao ?? "(sem feedback registrado)"}`,
  }];
  const resultado = await responderTutor(
    escolaId, pergunta, { embeddings: criarEmbeddings(), llm: criarLlm(), repositorio: new RepositorioPostgres() },
    historico, undefined, da.disciplina, da.ano,
  );
  return { recusado: resultado.recusado, resposta: resultado.resposta, origemResposta: resultado.origemResposta };
}
