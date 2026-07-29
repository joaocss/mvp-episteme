// Consultas do painel gestor (diretor/coordenador) — escopo da escola.
import { pool } from "./pool";


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
