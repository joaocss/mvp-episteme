// Consultas do painel do professor (Postgres direto), restritas aos alunos das
// turmas em que o professor leciona.
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export interface EstatProfessor {
  totalAlunos: number;
  totalSessoes: number;
  totalPerguntas: number;
  alertasSeguranca: number;
}

export interface PerguntaRecente { aluno: string; conteudo: string; quando: string; }
export interface AtividadeAluno { aluno: string; sessoes: number; perguntas: number; ultimaAtividade: string | null; }

const ALUNOS_DO_PROFESSOR = `
  select distinct m.aluno_id
  from professores_turmas pt
  join matriculas m on m.turma_id = pt.turma_id
  where pt.professor_id = $1
`;

export async function estatisticasProfessor(professorId: string): Promise<EstatProfessor> {
  const { rows } = await pool.query(
    `with alunos as (${ALUNOS_DO_PROFESSOR})
     select
       (select count(*) from alunos) as total_alunos,
       (select count(*) from sessoes_tutor s where s.aluno_id in (select aluno_id from alunos)) as total_sessoes,
       (select count(*) from interacoes i join sessoes_tutor s on s.id = i.sessao_id
          where i.autor = 'aluno' and s.aluno_id in (select aluno_id from alunos)) as total_perguntas,
       (select count(*) from guardrail_eventos g join interacoes i on i.id = g.interacao_id
          join sessoes_tutor s on s.id = i.sessao_id
          where g.categoria = 'seguranca_infantil' and s.aluno_id in (select aluno_id from alunos)) as alertas`,
    [professorId],
  );
  const r = rows[0] ?? {};
  return {
    totalAlunos: Number(r.total_alunos) || 0,
    totalSessoes: Number(r.total_sessoes) || 0,
    totalPerguntas: Number(r.total_perguntas) || 0,
    alertasSeguranca: Number(r.alertas) || 0,
  };
}

export async function perguntasRecentes(professorId: string, limite = 10): Promise<PerguntaRecente[]> {
  const { rows } = await pool.query(
    `with alunos as (${ALUNOS_DO_PROFESSOR})
     select u.nome as aluno, i.conteudo, i.criado_em
     from interacoes i
     join sessoes_tutor s on s.id = i.sessao_id
     join usuarios u on u.id = s.aluno_id
     where i.autor = 'aluno' and s.aluno_id in (select aluno_id from alunos)
     order by i.criado_em desc
     limit $2`,
    [professorId, limite],
  );
  return rows.map((r) => ({
    aluno: r.aluno,
    conteudo: r.conteudo,
    quando: new Date(r.criado_em).toLocaleString("pt-BR"),
  }));
}

export async function atividadePorAluno(professorId: string): Promise<AtividadeAluno[]> {
  const { rows } = await pool.query(
    `select u.nome as aluno,
            count(distinct s.id) as sessoes,
            count(i.id) filter (where i.autor = 'aluno') as perguntas,
            max(i.criado_em) as ultima
     from professores_turmas pt
     join matriculas m on m.turma_id = pt.turma_id
     join usuarios u on u.id = m.aluno_id
     left join sessoes_tutor s on s.aluno_id = u.id
     left join interacoes i on i.sessao_id = s.id
     where pt.professor_id = $1
     group by u.nome
     order by ultima desc nulls last`,
    [professorId],
  );
  return rows.map((r) => ({
    aluno: r.aluno,
    sessoes: Number(r.sessoes) || 0,
    perguntas: Number(r.perguntas) || 0,
    ultimaAtividade: r.ultima ? new Date(r.ultima).toLocaleString("pt-BR") : null,
  }));
}

export async function registrarAcessoProfessor(escolaId: string, professorId: string): Promise<void> {
  await pool.query(
    `insert into acessos_professor (escola_id, professor_id, recurso) values ($1, $2, 'painel')`,
    [escolaId, professorId],
  );
}
