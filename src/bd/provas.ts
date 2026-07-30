// Modulo de Provas: CRUD nao-IA (professor e aluno). Todas as escritas passam
// pelo pool privilegiado; por isso SEMPRE restringimos por escola_id (e, para
// o professor, por prova_id pertencente a ele) no WHERE.
import { pool } from "./pool";

export type TipoQuestao = "objetiva" | "dissertativa";
export type StatusProva = "rascunho" | "publicada" | "encerrada";

export interface Alternativa { letra: string; texto: string; }

export interface QuestaoParaInserir {
  ordem: number;
  tipo: TipoQuestao;
  enunciado: string;
  alternativas: Alternativa[] | null;
  gabarito: string;
  explicacao: string | null;
}

// ---------------------------------------------------------------- professor

// Uma linha por combinacao (turma, disciplina) que o professor leciona —
// desde a Fase 7 (multi-disciplina) uma turma pode ter varias disciplinas.
export interface TurmaProfessor { id: string; nome: string; serie: string; anoLetivo: number; disciplina: string; }

export async function turmasDoProfessor(escolaId: string, professorId: string): Promise<TurmaProfessor[]> {
  const { rows } = await pool.query(
    `select distinct t.id, t.nome, t.serie, t.ano_letivo, pt.disciplina
     from professores_turmas pt join turmas t on t.id = pt.turma_id
     where pt.escola_id = $1 and pt.professor_id = $2
     order by t.nome, pt.disciplina`,
    [escolaId, professorId],
  );
  return rows.map((r) => ({ id: r.id, nome: r.nome, serie: r.serie, anoLetivo: r.ano_letivo, disciplina: r.disciplina }));
}

export async function criarProvaRascunho(
  escolaId: string, professorId: string, turmaId: string, titulo: string, assunto: string,
  numeroQuestoes: number, disciplina = "matematica",
): Promise<string> {
  const { rows } = await pool.query(
    `insert into provas (escola_id, professor_id, turma_id, titulo, assunto, numero_questoes, disciplina)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [escolaId, professorId, turmaId, titulo, assunto, numeroQuestoes, disciplina],
  );
  return rows[0].id;
}

export async function inserirQuestoes(escolaId: string, provaId: string, questoes: QuestaoParaInserir[]): Promise<void> {
  const cliente = await pool.connect();
  try {
    await cliente.query("begin");
    for (const q of questoes) {
      await cliente.query(
        `insert into questoes (escola_id, prova_id, ordem, tipo, enunciado, alternativas, gabarito, explicacao)
         values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`,
        [escolaId, provaId, q.ordem, q.tipo, q.enunciado,
         q.alternativas ? JSON.stringify(q.alternativas) : null, q.gabarito, q.explicacao],
      );
    }
    await cliente.query("commit");
  } catch (e) {
    await cliente.query("rollback");
    throw e;
  } finally {
    cliente.release();
  }
}

export interface ProvaResumo {
  id: string; titulo: string; assunto: string; status: StatusProva; numeroQuestoes: number; turma: string; criadoEm: string;
}

export async function listarProvasProfessor(escolaId: string, professorId: string): Promise<ProvaResumo[]> {
  const { rows } = await pool.query(
    `select p.id, p.titulo, p.assunto, p.status, p.numero_questoes, p.criado_em, t.nome as turma
     from provas p join turmas t on t.id = p.turma_id
     where p.escola_id = $1 and p.professor_id = $2
     order by p.criado_em desc`,
    [escolaId, professorId],
  );
  return rows.map((r) => ({
    id: r.id, titulo: r.titulo, assunto: r.assunto, status: r.status, numeroQuestoes: r.numero_questoes,
    turma: r.turma, criadoEm: new Date(r.criado_em).toLocaleString("pt-BR"),
  }));
}

export interface QuestaoProfessor {
  id: string; ordem: number; tipo: TipoQuestao; enunciado: string;
  alternativas: Alternativa[] | null; gabarito: string; explicacao: string | null;
}
export interface ProvaComQuestoes {
  id: string; titulo: string; assunto: string; status: StatusProva; turma: string; questoes: QuestaoProfessor[];
}

export async function obterProvaComQuestoes(
  escolaId: string, professorId: string, provaId: string,
): Promise<ProvaComQuestoes | null> {
  const prova = await pool.query(
    `select p.id, p.titulo, p.assunto, p.status, t.nome as turma
     from provas p join turmas t on t.id = p.turma_id
     where p.id = $3 and p.escola_id = $1 and p.professor_id = $2`,
    [escolaId, professorId, provaId],
  );
  if (!prova.rows[0]) return null;
  const { rows } = await pool.query(
    `select id, ordem, tipo, enunciado, alternativas, gabarito, explicacao
     from questoes where prova_id = $1 order by ordem`,
    [provaId],
  );
  return {
    ...prova.rows[0],
    questoes: rows.map((r) => ({
      id: r.id, ordem: r.ordem, tipo: r.tipo, enunciado: r.enunciado,
      alternativas: r.alternativas ?? null, gabarito: r.gabarito, explicacao: r.explicacao ?? null,
    })),
  };
}

export async function editarQuestao(
  escolaId: string, professorId: string, questaoId: string,
  enunciado: string, alternativas: Alternativa[] | null, gabarito: string, explicacao: string | null,
): Promise<void> {
  await pool.query(
    `update questoes set enunciado = $4, alternativas = $5::jsonb, gabarito = $6, explicacao = $7
     where id = $3 and escola_id = $1
       and prova_id in (select id from provas where professor_id = $2 and escola_id = $1)`,
    [escolaId, professorId, questaoId, enunciado, alternativas ? JSON.stringify(alternativas) : null, gabarito, explicacao],
  );
}

export async function excluirQuestao(escolaId: string, professorId: string, questaoId: string): Promise<void> {
  await pool.query(
    `delete from questoes where id = $3 and escola_id = $1
       and prova_id in (select id from provas where professor_id = $2 and escola_id = $1)`,
    [escolaId, professorId, questaoId],
  );
}

export async function editarProva(escolaId: string, professorId: string, provaId: string, titulo: string): Promise<void> {
  await pool.query(
    `update provas set titulo = $4 where id = $3 and escola_id = $1 and professor_id = $2`,
    [escolaId, professorId, provaId, titulo],
  );
}

export async function excluirProva(escolaId: string, professorId: string, provaId: string): Promise<void> {
  // questoes e respostas caem por cascade (FK on delete cascade).
  await pool.query(
    `delete from provas where id = $3 and escola_id = $1 and professor_id = $2`,
    [escolaId, professorId, provaId],
  );
}

export async function publicarProva(escolaId: string, professorId: string, provaId: string): Promise<void> {
  const { rows } = await pool.query(
    `select count(q.id) as questoes,
            count(q.id) filter (where q.gabarito is null or q.gabarito = '') as sem_gabarito
     from provas p left join questoes q on q.prova_id = p.id
     where p.id = $3 and p.escola_id = $1 and p.professor_id = $2
     group by p.id`,
    [escolaId, professorId, provaId],
  );
  const r = rows[0];
  if (!r) throw new Error("Prova não encontrada.");
  const totalQuestoes = Number(r.questoes) || 0;
  if (totalQuestoes < 1) throw new Error("Adicione ao menos uma questão antes de publicar.");
  if (Number(r.sem_gabarito) > 0) throw new Error("Preencha o gabarito de todas as questões antes de publicar.");
  await pool.query(
    `update provas set status = 'publicada', publicada_em = now(), numero_questoes = $4
     where id = $3 and escola_id = $1 and professor_id = $2`,
    [escolaId, professorId, provaId, totalQuestoes],
  );
}

// -------------------------------------------------------------------- aluno

export interface ProvaDisponivel {
  id: string; titulo: string; assunto: string; turma: string; numeroQuestoes: number; respondidas: number;
}

export async function listarProvasDisponiveis(escolaId: string, alunoId: string): Promise<ProvaDisponivel[]> {
  const { rows } = await pool.query(
    `select p.id, p.titulo, p.assunto, p.numero_questoes, t.nome as turma,
            count(r.id) as respondidas
     from provas p
     join turmas t on t.id = p.turma_id
     join matriculas m on m.turma_id = p.turma_id and m.aluno_id = $2
     left join questoes q on q.prova_id = p.id
     left join respostas r on r.questao_id = q.id and r.aluno_id = $2
     where p.escola_id = $1 and p.status = 'publicada'
     group by p.id, t.nome
     order by p.criado_em desc`,
    [escolaId, alunoId],
  );
  return rows.map((r) => ({
    id: r.id, titulo: r.titulo, assunto: r.assunto, turma: r.turma,
    numeroQuestoes: r.numero_questoes, respondidas: Number(r.respondidas) || 0,
  }));
}

export interface QuestaoAluno {
  id: string; ordem: number; tipo: TipoQuestao; enunciado: string; alternativas: Alternativa[] | null;
  numeroQuestoes: number; tituloProva: string;
}

export async function proximaQuestao(escolaId: string, alunoId: string, provaId: string): Promise<QuestaoAluno | null> {
  const { rows } = await pool.query(
    `select q.id, q.ordem, q.tipo, q.enunciado, q.alternativas, p.numero_questoes, p.titulo
     from questoes q
     join provas p on p.id = q.prova_id
     join matriculas m on m.turma_id = p.turma_id and m.aluno_id = $2
     left join respostas r on r.questao_id = q.id and r.aluno_id = $2
     where p.id = $3 and p.escola_id = $1 and p.status = 'publicada' and r.id is null
     order by q.ordem asc
     limit 1`,
    [escolaId, alunoId, provaId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id, ordem: r.ordem, tipo: r.tipo, enunciado: r.enunciado, alternativas: r.alternativas ?? null,
    numeroQuestoes: r.numero_questoes, tituloProva: r.titulo,
  };
}

export async function registrarResposta(
  escolaId: string, alunoId: string, questaoId: string, respostaAluno: string,
): Promise<{ tipo: TipoQuestao; correta: boolean | null }> {
  const questao = (await pool.query(
    `select q.id, q.tipo, q.gabarito
     from questoes q
     join provas p on p.id = q.prova_id
     join matriculas m on m.turma_id = p.turma_id and m.aluno_id = $2
     where q.id = $3 and p.escola_id = $1 and p.status = 'publicada'`,
    [escolaId, alunoId, questaoId],
  )).rows[0];
  if (!questao) throw new Error("Questão não encontrada ou prova não disponível.");

  const objetiva = questao.tipo === "objetiva";
  const correta = objetiva ? respostaAluno.trim().toUpperCase() === String(questao.gabarito).trim().toUpperCase() : null;
  const nota = objetiva ? (correta ? 10 : 0) : null;

  const ins = await pool.query(
    `insert into respostas (escola_id, questao_id, aluno_id, resposta_aluno, correta, nota)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (questao_id, aluno_id) do nothing
     returning id`,
    [escolaId, questaoId, alunoId, respostaAluno, correta, nota],
  );
  if (!ins.rows[0]) throw new Error("Você já respondeu essa questão.");
  return { tipo: questao.tipo, correta };
}

export interface GabaritoQuestao { gabarito: string; explicacao: string | null; }

export async function consultarGabarito(escolaId: string, alunoId: string, questaoId: string): Promise<GabaritoQuestao> {
  const { rows } = await pool.query(
    `select q.gabarito, q.explicacao
     from respostas r join questoes q on q.id = r.questao_id
     where r.questao_id = $2 and r.aluno_id = $3 and r.escola_id = $1`,
    [escolaId, questaoId, alunoId],
  );
  if (!rows[0]) throw new Error("Responda a questão antes de consultar o gabarito.");
  await pool.query(
    `update respostas set gabarito_consultado = true where questao_id = $2 and aluno_id = $3 and escola_id = $1`,
    [escolaId, questaoId, alunoId],
  );
  return { gabarito: rows[0].gabarito, explicacao: rows[0].explicacao ?? null };
}

export interface QuestaoResultado {
  id: string; ordem: number; tipo: TipoQuestao; enunciado: string;
  respostaAluno: string | null; correta: boolean | null; nota: number | null;
  gabarito: string; explicacao: string | null; feedbackIa: string | null;
  feedbackProfessor: string | null; corrigidaPeloProfessor: boolean;
}
export interface ResultadoProva {
  titulo: string; totalAcertos: number; totalErros: number; notaMedia: number; questoes: QuestaoResultado[];
}

export async function resultadoProva(escolaId: string, alunoId: string, provaId: string): Promise<ResultadoProva | null> {
  const prova = (await pool.query(
    `select titulo, numero_questoes from provas where id = $1 and escola_id = $2`,
    [provaId, escolaId],
  )).rows[0];
  if (!prova) return null;

  const { rows } = await pool.query(
    `select q.id, q.ordem, q.tipo, q.enunciado, q.gabarito, q.explicacao,
            r.resposta_aluno, r.correta, r.nota_efetiva, r.feedback_ia, r.feedback_professor, r.nota_manual
     from questoes q
     join respostas r on r.questao_id = q.id and r.aluno_id = $2
     where q.prova_id = $3 and q.escola_id = $1
     order by q.ordem`,
    [escolaId, alunoId, provaId],
  );
  if (rows.length < prova.numero_questoes) return null; // ainda nao concluiu

  const questoes: QuestaoResultado[] = rows.map((r) => ({
    id: r.id, ordem: r.ordem, tipo: r.tipo, enunciado: r.enunciado,
    respostaAluno: r.resposta_aluno, correta: r.correta,
    nota: r.nota_efetiva !== null ? Number(r.nota_efetiva) : null,
    gabarito: r.gabarito, explicacao: r.explicacao ?? null, feedbackIa: r.feedback_ia ?? null,
    feedbackProfessor: r.feedback_professor ?? null, corrigidaPeloProfessor: r.nota_manual !== null,
  }));
  const objetivas = questoes.filter((q) => q.tipo === "objetiva");
  const totalAcertos = objetivas.filter((q) => q.correta === true).length;
  const totalErros = objetivas.filter((q) => q.correta === false).length;
  const notas = questoes.map((q) => q.nota).filter((n): n is number => n !== null);
  const notaMedia = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;

  return { titulo: prova.titulo, totalAcertos, totalErros, notaMedia: Number(notaMedia.toFixed(2)), questoes };
}

// ---------------------------------------------------- correcao manual (professor)

export async function corrigirManualmente(
  escolaId: string, professorId: string, questaoId: string, alunoId: string,
  notaManual: number, feedbackProfessor: string | null,
): Promise<void> {
  await pool.query(
    `update respostas set nota_manual = $5, feedback_professor = $6, corrigido_por = $2, corrigido_em = now()
     where questao_id = $3 and aluno_id = $4 and escola_id = $1
       and questao_id in (
         select id from questoes where prova_id in (
           select id from provas where professor_id = $2 and escola_id = $1))`,
    [escolaId, professorId, questaoId, alunoId, notaManual, feedbackProfessor || null],
  );
}

export interface RespostaParaCorrigir {
  questaoId: string; alunoId: string; aluno: string; enunciado: string; tipo: TipoQuestao;
  respostaAluno: string | null; gabarito: string; notaAutomatica: number | null; notaManual: number | null;
  feedbackIa: string | null; feedbackProfessor: string | null;
}

export async function respostasParaCorrecao(
  escolaId: string, professorId: string, provaId: string,
): Promise<RespostaParaCorrigir[]> {
  const { rows } = await pool.query(
    `select q.id as questao_id, r.aluno_id, u.nome as aluno, q.enunciado, q.tipo,
            r.resposta_aluno, q.gabarito, r.nota as nota_automatica, r.nota_manual, r.feedback_ia, r.feedback_professor
     from questoes q
     join respostas r on r.questao_id = q.id
     join usuarios u on u.id = r.aluno_id
     join provas p on p.id = q.prova_id
     where p.id = $3 and p.escola_id = $1 and p.professor_id = $2
     order by q.ordem, u.nome`,
    [escolaId, professorId, provaId],
  );
  return rows.map((r) => ({
    questaoId: r.questao_id, alunoId: r.aluno_id, aluno: r.aluno, enunciado: r.enunciado, tipo: r.tipo,
    respostaAluno: r.resposta_aluno, gabarito: r.gabarito,
    notaAutomatica: r.nota_automatica !== null ? Number(r.nota_automatica) : null,
    notaManual: r.nota_manual !== null ? Number(r.nota_manual) : null,
    feedbackIa: r.feedback_ia ?? null, feedbackProfessor: r.feedback_professor ?? null,
  }));
}

export async function salvarFeedbackIa(
  escolaId: string, questaoId: string, alunoId: string, feedback: string, nota?: number,
): Promise<void> {
  if (nota !== undefined) {
    await pool.query(
      `update respostas set feedback_ia = $4, nota = $5
       where questao_id = $2 and aluno_id = $3 and escola_id = $1`,
      [escolaId, questaoId, alunoId, feedback, nota],
    );
  } else {
    await pool.query(
      `update respostas set feedback_ia = $4
       where questao_id = $2 and aluno_id = $3 and escola_id = $1`,
      [escolaId, questaoId, alunoId, feedback],
    );
  }
}
