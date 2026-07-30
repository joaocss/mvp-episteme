// Consultas do painel gestor (diretor/coordenador) — escopo da escola inteira.
import { pool } from "./pool";
import { desempenhoProvasEscola } from "./notas";

export { desempenhoProvasEscola };


export interface KpisGestor {
  alunos: number; professores: number; sessoes: number; perguntas: number; alertas: number;
}

export async function kpisGestor(escolaId: string): Promise<KpisGestor> {
  const { rows } = await pool.query(
    `select
       (select count(*) from usuarios where escola_id = $1 and papel = 'aluno') as alunos,
       (select count(*) from usuarios where escola_id = $1 and papel = 'professor') as professores,
       (select count(*) from sessoes_tutor where escola_id = $1) as sessoes,
       (select count(*) from interacoes where escola_id = $1 and autor = 'aluno') as perguntas,
       (select count(*) from guardrail_eventos where escola_id = $1 and categoria = 'seguranca_infantil') as alertas`,
    [escolaId],
  );
  const r = rows[0] ?? {};
  return {
    alunos: Number(r.alunos) || 0, professores: Number(r.professores) || 0,
    sessoes: Number(r.sessoes) || 0, perguntas: Number(r.perguntas) || 0, alertas: Number(r.alertas) || 0,
  };
}

export interface PontoDia { dia: string; total: number; }

export async function perguntasPorDia(escolaId: string, dias = 14): Promise<PontoDia[]> {
  const { rows } = await pool.query(
    `select date_trunc('day', criado_em) as d, count(*) as total
     from interacoes
     where escola_id = $1 and autor = 'aluno' and criado_em >= now() - make_interval(days => $2)
     group by 1 order by 1`,
    [escolaId, dias],
  );
  return rows.map((r) => ({
    dia: new Date(r.d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    total: Number(r.total) || 0,
  }));
}

export interface AlunoAtivo { aluno: string; perguntas: number; }

export async function alunosMaisAtivos(escolaId: string, limite = 8): Promise<AlunoAtivo[]> {
  const { rows } = await pool.query(
    `select u.nome as aluno, count(i.id) as perguntas
     from interacoes i
     join sessoes_tutor s on s.id = i.sessao_id
     join usuarios u on u.id = s.aluno_id
     where i.escola_id = $1 and i.autor = 'aluno'
     group by u.nome order by perguntas desc limit $2`,
    [escolaId, limite],
  );
  return rows.map((r) => ({ aluno: r.aluno, perguntas: Number(r.perguntas) || 0 }));
}

// ------------------------------------------------------- Modulo de Provas

export interface MediaNotaTurma { turma: string; media: number; }

export async function mediaNotasPorTurma(escolaId: string): Promise<MediaNotaTurma[]> {
  const { rows } = await pool.query(
    `select t.nome as turma, avg(r.nota) as media
     from respostas r
     join questoes q on q.id = r.questao_id
     join provas p on p.id = q.prova_id
     join turmas t on t.id = p.turma_id
     where r.escola_id = $1 and p.status in ('publicada', 'encerrada') and r.nota is not null
     group by t.nome order by t.nome`,
    [escolaId],
  );
  return rows.map((r) => ({ turma: r.turma, media: Number(Number(r.media).toFixed(2)) || 0 }));
}

export interface AprovacaoTurma { turma: string; aprovados: number; reprovados: number; }

export async function taxaAprovacaoPorTurma(escolaId: string, limiar = 6): Promise<AprovacaoTurma[]> {
  const { rows } = await pool.query(
    `with media_aluno as (
       select t.id as turma_id, t.nome as turma, r.aluno_id, avg(r.nota) as media
       from respostas r
       join questoes q on q.id = r.questao_id
       join provas p on p.id = q.prova_id
       join turmas t on t.id = p.turma_id
       where r.escola_id = $1 and p.status in ('publicada', 'encerrada') and r.nota is not null
       group by t.id, t.nome, r.aluno_id
     )
     select turma,
       count(*) filter (where media >= $2) as aprovados,
       count(*) filter (where media < $2) as reprovados
     from media_aluno
     group by turma order by turma`,
    [escolaId, limiar],
  );
  return rows.map((r) => ({ turma: r.turma, aprovados: Number(r.aprovados) || 0, reprovados: Number(r.reprovados) || 0 }));
}

export interface TurmaComAlunos { turmaId: string; turma: string; alunos: { id: string; nome: string }[]; }

export async function alunosPorTurmaEscola(escolaId: string): Promise<TurmaComAlunos[]> {
  const { rows } = await pool.query(
    `select t.id as turma_id, t.nome as turma, u.id as aluno_id, u.nome as aluno
     from turmas t
     left join matriculas m on m.turma_id = t.id
     left join usuarios u on u.id = m.aluno_id
     where t.escola_id = $1
     order by t.nome, u.nome`,
    [escolaId],
  );
  const porTurma = new Map<string, TurmaComAlunos>();
  for (const r of rows) {
    if (!porTurma.has(r.turma_id)) porTurma.set(r.turma_id, { turmaId: r.turma_id, turma: r.turma, alunos: [] });
    if (r.aluno_id) porTurma.get(r.turma_id)!.alunos.push({ id: r.aluno_id, nome: r.aluno });
  }
  return [...porTurma.values()];
}

// ------------------------------------------------ logs/alertas (monitoramento)

export interface AlertaEscola { aluno: string; turma: string; categoria: string; severidade: string; detalhe: string; quando: string; }

export async function alertasEscola(escolaId: string, limite = 100): Promise<AlertaEscola[]> {
  const { rows } = await pool.query(
    `select u.nome as aluno, t.nome as turma, g.categoria, g.severidade, g.detalhe, g.criado_em
     from guardrail_eventos g
     join interacoes i on i.id = g.interacao_id
     join sessoes_tutor s on s.id = i.sessao_id
     join usuarios u on u.id = s.aluno_id
     left join matriculas m on m.aluno_id = u.id
     left join turmas t on t.id = m.turma_id
     where g.escola_id = $1
     order by (g.severidade = 'alta') desc, g.criado_em desc
     limit $2`,
    [escolaId, limite],
  );
  return rows.map((r) => ({
    aluno: r.aluno, turma: r.turma ?? "—", categoria: r.categoria, severidade: r.severidade,
    detalhe: r.detalhe, quando: new Date(r.criado_em).toLocaleString("pt-BR"),
  }));
}

export interface EventoAuditoria { ator: string | null; acao: string; entidade: string | null; quando: string; }

export async function auditoriaEscola(escolaId: string, limite = 100): Promise<EventoAuditoria[]> {
  const { rows } = await pool.query(
    `select u.nome as ator, a.acao, a.entidade, a.criado_em
     from auditoria a
     left join usuarios u on u.id = a.ator_id
     where a.escola_id = $1
     order by a.criado_em desc
     limit $2`,
    [escolaId, limite],
  );
  return rows.map((r) => ({
    ator: r.ator ?? null, acao: r.acao, entidade: r.entidade ?? null,
    quando: new Date(r.criado_em).toLocaleString("pt-BR"),
  }));
}

export interface EvasaoTurma { turma: string; ativos: number; inativos: number; }

export async function evasaoAlunos(escolaId: string, dias = 14): Promise<EvasaoTurma[]> {
  const { rows } = await pool.query(
    `with atividade as (
       select m.turma_id, m.aluno_id,
         greatest(
           coalesce((select max(r.respondida_em) from respostas r where r.aluno_id = m.aluno_id and r.escola_id = $1), 'epoch'::timestamptz),
           coalesce((select max(s.iniciada_em) from sessoes_tutor s where s.aluno_id = m.aluno_id and s.escola_id = $1), 'epoch'::timestamptz)
         ) as ultima_atividade
       from matriculas m
       where m.escola_id = $1
     )
     select t.nome as turma,
       count(*) filter (where a.ultima_atividade >= now() - make_interval(days => $2)) as ativos,
       count(*) filter (where a.ultima_atividade < now() - make_interval(days => $2)) as inativos
     from atividade a
     join turmas t on t.id = a.turma_id
     group by t.nome order by t.nome`,
    [escolaId, dias],
  );
  return rows.map((r) => ({ turma: r.turma, ativos: Number(r.ativos) || 0, inativos: Number(r.inativos) || 0 }));
}
