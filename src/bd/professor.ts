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

export interface ResumoSessao {
  sessaoId: string; aluno: string; alunoId: string; perguntas: number; iniciada: string;
}

export async function listarSessoes(professorId: string, limite = 30): Promise<ResumoSessao[]> {
  const { rows } = await pool.query(
    `with alunos as (${ALUNOS_DO_PROFESSOR})
     select s.id as sessao_id, u.nome as aluno, s.aluno_id,
            count(i.id) filter (where i.autor = 'aluno') as perguntas,
            s.iniciada_em
     from sessoes_tutor s
     join usuarios u on u.id = s.aluno_id
     left join interacoes i on i.sessao_id = s.id
     where s.aluno_id in (select aluno_id from alunos)
     group by s.id, u.nome, s.aluno_id, s.iniciada_em
     order by s.iniciada_em desc
     limit $2`,
    [professorId, limite],
  );
  return rows.map((r) => ({
    sessaoId: r.sessao_id, aluno: r.aluno, alunoId: r.aluno_id,
    perguntas: Number(r.perguntas) || 0, iniciada: new Date(r.iniciada_em).toLocaleString("pt-BR"),
  }));
}

export interface MensagemConversa { autor: string; conteudo: string; quando: string; }

export async function conversaDaSessao(
  professorId: string, sessaoId: string,
): Promise<{ aluno: string; mensagens: MensagemConversa[] } | null> {
  const dono = await pool.query(
    `select u.nome as aluno
     from sessoes_tutor s
     join usuarios u on u.id = s.aluno_id
     join matriculas m on m.aluno_id = s.aluno_id
     join professores_turmas pt on pt.turma_id = m.turma_id
     where s.id = $1 and pt.professor_id = $2
     limit 1`,
    [sessaoId, professorId],
  );
  if (!dono.rows[0]) return null; // nao pertence a uma turma do professor
  const { rows } = await pool.query(
    `select autor, conteudo, criado_em from interacoes where sessao_id = $1 order by criado_em asc`,
    [sessaoId],
  );
  return {
    aluno: dono.rows[0].aluno,
    mensagens: rows.map((r) => ({
      autor: r.autor, conteudo: r.conteudo, quando: new Date(r.criado_em).toLocaleString("pt-BR"),
    })),
  };
}

export interface Alerta { aluno: string; categoria: string; severidade: string; detalhe: string; quando: string; }

export async function alertas(professorId: string, limite = 50): Promise<Alerta[]> {
  const { rows } = await pool.query(
    `with alunos as (${ALUNOS_DO_PROFESSOR})
     select u.nome as aluno, g.categoria, g.severidade, g.detalhe, g.criado_em
     from guardrail_eventos g
     join interacoes i on i.id = g.interacao_id
     join sessoes_tutor s on s.id = i.sessao_id
     join usuarios u on u.id = s.aluno_id
     where s.aluno_id in (select aluno_id from alunos)
     order by (g.severidade = 'alta') desc, g.criado_em desc
     limit $2`,
    [professorId, limite],
  );
  return rows.map((r) => ({
    aluno: r.aluno, categoria: r.categoria, severidade: r.severidade,
    detalhe: r.detalhe, quando: new Date(r.criado_em).toLocaleString("pt-BR"),
  }));
}

export async function exportarInteracoesCsv(professorId: string): Promise<string> {
  const { rows } = await pool.query(
    `with alunos as (${ALUNOS_DO_PROFESSOR})
     select u.nome as aluno, i.sessao_id, i.autor, i.conteudo, i.modelo, i.criado_em
     from interacoes i
     join sessoes_tutor s on s.id = i.sessao_id
     join usuarios u on u.id = s.aluno_id
     where s.aluno_id in (select aluno_id from alunos)
     order by i.criado_em asc`,
    [professorId],
  );
  const cab = "aluno,sessao,autor,conteudo,modelo,quando";
  const linhas = rows.map((r) => {
    const campos = [r.aluno, r.sessao_id, r.autor, r.conteudo, r.modelo ?? "", new Date(r.criado_em).toISOString()];
    return campos.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
  });
  return [cab, ...linhas].join("\n");
}
