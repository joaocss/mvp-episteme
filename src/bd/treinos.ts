// Camada de banco do Modo Treinador. Professor cria treinos e ve o processo dos
// alunos; aluno resolve com pistas da IA. Todas as escritas passam pelo pool
// privilegiado — SEMPRE filtrar por escola_id (isolamento entre escolas).
import { pool } from "./pool";

export type StatusTreino = "rascunho" | "publicado" | "arquivado";
export type StatusTreinoSessao = "em_andamento" | "concluido";
export type TipoTreinoInteracao = "tentativa" | "pista" | "resposta_final" | "reflexao" | "sistema";

export interface TurmaDisciplinaProfessor { turmaId: string; turma: string; serie: string; disciplina: string }
export interface Treino {
  id: string; turmaId: string; turmaNome?: string; disciplina: string;
  titulo: string; enunciado: string; objetivo: string | null; status: StatusTreino; criadoEm: string;
}
export interface TreinoResumo extends Treino { sessoes: number; concluidos: number }
export interface TreinoDoAluno extends Treino { sessaoStatus: StatusTreinoSessao | null; pistasUsadas: number }
export interface SessaoTreino {
  id: string; alunoId: string; alunoNome?: string; status: StatusTreinoSessao;
  pistasUsadas: number; respostaFinal: string | null; reflexao: string | null;
  iniciadaEm: string; concluidaEm: string | null;
}
export interface InteracaoTreino {
  autor: "aluno" | "ia"; tipo: TipoTreinoInteracao; conteudo: string; criadoEm: string;
}

// -------- Professor: turmas/disciplinas que leciona (para criar treino) --------
export async function turmasDisciplinasDoProfessor(
  escolaId: string, professorId: string,
): Promise<TurmaDisciplinaProfessor[]> {
  const { rows } = await pool.query(
    `select distinct t.id as turma_id, t.nome as turma, t.serie, pt.disciplina
     from professores_turmas pt
     join turmas t on t.id = pt.turma_id
     where pt.escola_id = $1 and pt.professor_id = $2
     order by t.nome, pt.disciplina`,
    [escolaId, professorId],
  );
  return rows.map((r) => ({ turmaId: r.turma_id, turma: r.turma, serie: r.serie ?? "6o ano", disciplina: r.disciplina }));
}

// -------- Professor: CRUD de treinos --------
export async function criarTreino(
  escolaId: string,
  dados: { turmaId: string; professorId: string; disciplina: string; titulo: string; enunciado: string; objetivo?: string | null; publicar?: boolean },
): Promise<string> {
  const { rows } = await pool.query(
    `insert into treinos (escola_id, turma_id, professor_id, disciplina, titulo, enunciado, objetivo, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
    [escolaId, dados.turmaId, dados.professorId, dados.disciplina, dados.titulo, dados.enunciado,
      dados.objetivo ?? null, dados.publicar ? "publicado" : "rascunho"],
  );
  return rows[0].id;
}

export async function listarTreinosDoProfessor(escolaId: string, professorId: string): Promise<TreinoResumo[]> {
  const { rows } = await pool.query(
    `select tr.*, t.nome as turma_nome,
            coalesce(s.n, 0) as sessoes, coalesce(s.c, 0) as concluidos
     from treinos tr
     join turmas t on t.id = tr.turma_id
     left join (
       select treino_id, count(*) as n, count(*) filter (where status = 'concluido') as c
       from treino_sessoes group by treino_id
     ) s on s.treino_id = tr.id
     where tr.escola_id = $1 and tr.professor_id = $2
     order by tr.criado_em desc`,
    [escolaId, professorId],
  );
  return rows.map((r) => ({ ...mapearTreino(r), sessoes: Number(r.sessoes) || 0, concluidos: Number(r.concluidos) || 0 }));
}

export async function definirStatusTreino(
  escolaId: string, professorId: string, treinoId: string, status: StatusTreino,
): Promise<void> {
  await pool.query(
    `update treinos set status = $4 where escola_id = $1 and professor_id = $2 and id = $3`,
    [escolaId, professorId, treinoId, status],
  );
}

export async function excluirTreino(escolaId: string, professorId: string, treinoId: string): Promise<void> {
  await pool.query(
    `delete from treinos where escola_id = $1 and professor_id = $2 and id = $3`,
    [escolaId, professorId, treinoId],
  );
}

// Treino de um professor (para a tela de acompanhamento). null se nao for dele.
export async function obterTreinoDoProfessor(
  escolaId: string, professorId: string, treinoId: string,
): Promise<Treino | null> {
  const { rows } = await pool.query(
    `select tr.*, t.nome as turma_nome from treinos tr join turmas t on t.id = tr.turma_id
     where tr.escola_id = $1 and tr.professor_id = $2 and tr.id = $3`,
    [escolaId, professorId, treinoId],
  );
  return rows[0] ? mapearTreino(rows[0]) : null;
}

// Sessoes (processo dos alunos) de um treino, para o professor acompanhar.
export async function sessoesDoTreino(escolaId: string, treinoId: string): Promise<SessaoTreino[]> {
  const { rows } = await pool.query(
    `select s.*, u.nome as aluno_nome from treino_sessoes s
     join usuarios u on u.id = s.aluno_id
     where s.escola_id = $1 and s.treino_id = $2
     order by s.iniciada_em desc`,
    [escolaId, treinoId],
  );
  return rows.map(mapearSessao);
}

// -------- Aluno: treinos publicados da sua turma --------
export async function listarTreinosDaTurma(
  escolaId: string, turmaId: string, alunoId: string,
): Promise<TreinoDoAluno[]> {
  const { rows } = await pool.query(
    `select tr.*, t.nome as turma_nome, s.status as sessao_status, coalesce(s.pistas_usadas, 0) as pistas
     from treinos tr
     join turmas t on t.id = tr.turma_id
     left join treino_sessoes s on s.treino_id = tr.id and s.aluno_id = $3
     where tr.escola_id = $1 and tr.turma_id = $2 and tr.status = 'publicado'
     order by tr.criado_em desc`,
    [escolaId, turmaId, alunoId],
  );
  return rows.map((r) => ({
    ...mapearTreino(r),
    sessaoStatus: (r.sessao_status ?? null) as StatusTreinoSessao | null,
    pistasUsadas: Number(r.pistas) || 0,
  }));
}

// Treino publicado especifico, garantindo que pertence a turma do aluno.
export async function obterTreinoPublicadoDaTurma(
  escolaId: string, treinoId: string, turmaId: string,
): Promise<Treino | null> {
  const { rows } = await pool.query(
    `select tr.*, t.nome as turma_nome from treinos tr join turmas t on t.id = tr.turma_id
     where tr.escola_id = $1 and tr.id = $2 and tr.turma_id = $3 and tr.status = 'publicado'`,
    [escolaId, treinoId, turmaId],
  );
  return rows[0] ? mapearTreino(rows[0]) : null;
}

// -------- Sessao do aluno (o processo) --------
export async function obterOuCriarSessaoTreino(
  escolaId: string, treinoId: string, alunoId: string,
): Promise<string> {
  const existente = await pool.query(
    `select id from treino_sessoes where escola_id = $1 and treino_id = $2 and aluno_id = $3`,
    [escolaId, treinoId, alunoId],
  );
  if (existente.rows[0]) return existente.rows[0].id;
  const { rows } = await pool.query(
    `insert into treino_sessoes (escola_id, treino_id, aluno_id) values ($1,$2,$3) returning id`,
    [escolaId, treinoId, alunoId],
  );
  return rows[0].id;
}

// Sessao existente do aluno num treino (sem criar) — para carregar a tela.
export async function sessaoPorTreino(
  escolaId: string, treinoId: string, alunoId: string,
): Promise<SessaoTreino | null> {
  const { rows } = await pool.query(
    `select s.*, u.nome as aluno_nome from treino_sessoes s
     join usuarios u on u.id = s.aluno_id
     where s.escola_id = $1 and s.treino_id = $2 and s.aluno_id = $3`,
    [escolaId, treinoId, alunoId],
  );
  return rows[0] ? mapearSessao(rows[0]) : null;
}

// Sessao + treino, validando que a sessao e do aluno (para a API do aluno).
export async function obterSessaoDoAluno(
  escolaId: string, sessaoId: string, alunoId: string,
): Promise<{ sessao: SessaoTreino; treino: Treino } | null> {
  const { rows } = await pool.query(
    `select s.*, u.nome as aluno_nome,
            tr.id as tr_id, tr.turma_id, tr.disciplina, tr.titulo, tr.enunciado, tr.objetivo,
            tr.status as tr_status, tr.criado_em as tr_criado_em
     from treino_sessoes s
     join treinos tr on tr.id = s.treino_id
     join usuarios u on u.id = s.aluno_id
     where s.escola_id = $1 and s.id = $2 and s.aluno_id = $3`,
    [escolaId, sessaoId, alunoId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    sessao: mapearSessao(r),
    treino: {
      id: r.tr_id, turmaId: r.turma_id, disciplina: r.disciplina, titulo: r.titulo,
      enunciado: r.enunciado, objetivo: r.objetivo ?? null, status: r.tr_status, criadoEm: new Date(r.tr_criado_em).toISOString(),
    },
  };
}

export async function historicoTreino(escolaId: string, sessaoId: string): Promise<InteracaoTreino[]> {
  const { rows } = await pool.query(
    `select autor, tipo, conteudo, criado_em from treino_interacoes
     where escola_id = $1 and sessao_id = $2 order by criado_em asc`,
    [escolaId, sessaoId],
  );
  return rows.map((r) => ({
    autor: r.autor, tipo: r.tipo, conteudo: r.conteudo, criadoEm: new Date(r.criado_em).toISOString(),
  }));
}

export async function registrarInteracaoTreino(
  escolaId: string, sessaoId: string, autor: "aluno" | "ia",
  tipo: TipoTreinoInteracao, conteudo: string, traceId?: string,
): Promise<void> {
  await pool.query(
    `insert into treino_interacoes (escola_id, sessao_id, autor, tipo, conteudo, trace_id)
     values ($1,$2,$3,$4,$5,$6)`,
    [escolaId, sessaoId, autor, tipo, conteudo, traceId ?? null],
  );
}

export async function incrementarPistas(escolaId: string, sessaoId: string): Promise<void> {
  await pool.query(
    `update treino_sessoes set pistas_usadas = pistas_usadas + 1 where escola_id = $1 and id = $2`,
    [escolaId, sessaoId],
  );
}

export async function concluirSessaoTreino(
  escolaId: string, sessaoId: string, alunoId: string, respostaFinal: string, reflexao: string,
): Promise<void> {
  await pool.query(
    `update treino_sessoes set status = 'concluido', resposta_final = $4, reflexao = $5, concluida_em = now()
     where escola_id = $1 and id = $2 and aluno_id = $3`,
    [escolaId, sessaoId, alunoId, respostaFinal, reflexao],
  );
}

// -------- mapeadores --------
function mapearTreino(r: any): Treino {
  return {
    id: r.id, turmaId: r.turma_id, turmaNome: r.turma_nome ?? undefined, disciplina: r.disciplina,
    titulo: r.titulo, enunciado: r.enunciado, objetivo: r.objetivo ?? null,
    status: r.status, criadoEm: new Date(r.criado_em).toISOString(),
  };
}
function mapearSessao(r: any): SessaoTreino {
  return {
    id: r.id, alunoId: r.aluno_id, alunoNome: r.aluno_nome ?? undefined, status: r.status,
    pistasUsadas: Number(r.pistas_usadas) || 0, respostaFinal: r.resposta_final ?? null, reflexao: r.reflexao ?? null,
    iniciadaEm: new Date(r.iniciada_em).toISOString(),
    concluidaEm: r.concluida_em ? new Date(r.concluida_em).toISOString() : null,
  };
}
