// Relatorios de desempenho com filtros (turma, disciplina, periodo) para o
// gestor/diretor. Trabalha sobre a tabela `notas`, normalizando cada nota em
// percentual (valor / nota_maxima) para comparar entre disciplinas com escalas
// diferentes. Aprovacao = percentual >= 60% (limiar padrao do relatorio).
import { pool } from "./pool";

export interface FiltroRelatorio {
  turmaId?: string | null;
  disciplina?: string | null;
  dataInicio?: string | null; // YYYY-MM-DD
  dataFim?: string | null;    // YYYY-MM-DD
}

export interface LinhaAluno { alunoId: string; aluno: string; turma: string; disciplina: string; media: number; avaliacoes: number; }
export interface PontoMes { mes: string; media: number; }
export interface FaixaDist { faixa: string; qtd: number; }
export interface PorDisciplina { disciplina: string; media: number; avaliacoes: number; }
export interface CompetenciaTrabalhada { codigo: string; descricao: string; disciplina: string; qtd: number; }

export interface Relatorio {
  geral: { media: number; aprovacao: number; avaliacoes: number; alunos: number };
  porAluno: LinhaAluno[];
  porMes: PontoMes[];
  distribuicao: FaixaDist[];
  porDisciplina: PorDisciplina[];
  porCompetencia: CompetenciaTrabalhada[];
}

const LIMIAR_APROVACAO = 0.6;

// Monta o WHERE + params comuns a todas as consultas do relatorio.
function montarFiltro(escolaId: string, f: FiltroRelatorio): { where: string; params: unknown[] } {
  const params: unknown[] = [escolaId];
  let where = "n.escola_id = $1 and n.nota_maxima > 0";
  if (f.turmaId) { params.push(f.turmaId); where += ` and n.turma_id = $${params.length}`; }
  if (f.disciplina) { params.push(f.disciplina); where += ` and n.disciplina = $${params.length}`; }
  if (f.dataInicio) { params.push(f.dataInicio); where += ` and n.data_lancamento >= $${params.length}`; }
  if (f.dataFim) { params.push(f.dataFim); where += ` and n.data_lancamento < ($${params.length}::date + interval '1 day')`; }
  return { where, params };
}

// WHERE da dimensao de competencias (tabela interacoes + competencias_bncc),
// espelhando os mesmos filtros (turma via matricula do aluno, disciplina da
// competencia BNCC, periodo pela data da interacao).
function montarFiltroCompetencia(escolaId: string, f: FiltroRelatorio): { where: string; params: unknown[] } {
  const params: unknown[] = [escolaId];
  let where = "i.escola_id = $1 and i.competencia_bncc is not null";
  if (f.turmaId) { params.push(f.turmaId); where += ` and m.turma_id = $${params.length}`; }
  if (f.disciplina) { params.push(f.disciplina); where += ` and cb.disciplina = $${params.length}`; }
  if (f.dataInicio) { params.push(f.dataInicio); where += ` and i.criado_em >= $${params.length}`; }
  if (f.dataFim) { params.push(f.dataFim); where += ` and i.criado_em < ($${params.length}::date + interval '1 day')`; }
  return { where, params };
}

export async function gerarRelatorio(escolaId: string, f: FiltroRelatorio): Promise<Relatorio> {
  const { where, params } = montarFiltro(escolaId, f);
  const fc = montarFiltroCompetencia(escolaId, f);

  const [geral, porAluno, porMes, distribuicao, porDisciplina, porCompetencia] = await Promise.all([
    pool.query(
      `select avg(n.valor / n.nota_maxima) as media,
              avg((n.valor / n.nota_maxima >= ${LIMIAR_APROVACAO})::int::float) as aprovacao,
              count(*) as avaliacoes,
              count(distinct n.aluno_id) as alunos
       from notas n where ${where}`, params),
    pool.query(
      `select u.id as aluno_id, u.nome as aluno, t.nome as turma, n.disciplina,
              avg(n.valor / n.nota_maxima) as media, count(*) as avaliacoes
       from notas n join usuarios u on u.id = n.aluno_id join turmas t on t.id = n.turma_id
       where ${where}
       group by u.id, u.nome, t.nome, n.disciplina
       order by media asc, u.nome`, params),
    pool.query(
      `select to_char(date_trunc('month', n.data_lancamento), 'YYYY-MM') as mes,
              avg(n.valor / n.nota_maxima) as media
       from notas n where ${where}
       group by 1 order by 1`, params),
    pool.query(
      `select faixa, count(*) as qtd from (
         select case
           when n.valor / n.nota_maxima < 0.2 then '0-20%'
           when n.valor / n.nota_maxima < 0.4 then '20-40%'
           when n.valor / n.nota_maxima < 0.6 then '40-60%'
           when n.valor / n.nota_maxima < 0.8 then '60-80%'
           else '80-100%' end as faixa
         from notas n where ${where}
       ) s group by faixa
       order by array_position(array['0-20%','20-40%','40-60%','60-80%','80-100%'], faixa)`, params),
    pool.query(
      `select n.disciplina, avg(n.valor / n.nota_maxima) as media, count(*) as avaliacoes
       from notas n where ${where}
       group by n.disciplina order by media desc`, params),
    pool.query(
      `select cb.codigo, cb.descricao, cb.disciplina, count(*) as qtd
       from interacoes i
       join sessoes_tutor s on s.id = i.sessao_id
       join competencias_bncc cb on cb.codigo = i.competencia_bncc
       left join matriculas m on m.aluno_id = s.aluno_id
       where ${fc.where}
       group by cb.codigo, cb.descricao, cb.disciplina
       order by qtd desc
       limit 12`, fc.params),
  ]);

  const pct = (v: unknown) => Math.round((Number(v) || 0) * 1000) / 10; // 1 casa, em %
  const g = geral.rows[0] ?? {};
  return {
    geral: {
      media: pct(g.media), aprovacao: pct(g.aprovacao),
      avaliacoes: Number(g.avaliacoes) || 0, alunos: Number(g.alunos) || 0,
    },
    porAluno: porAluno.rows.map((r) => ({
      alunoId: r.aluno_id, aluno: r.aluno, turma: r.turma, disciplina: r.disciplina,
      media: pct(r.media), avaliacoes: Number(r.avaliacoes) || 0,
    })),
    porMes: porMes.rows.map((r) => ({ mes: r.mes, media: pct(r.media) })),
    distribuicao: distribuicao.rows.map((r) => ({ faixa: r.faixa, qtd: Number(r.qtd) || 0 })),
    porDisciplina: porDisciplina.rows.map((r) => ({
      disciplina: r.disciplina, media: pct(r.media), avaliacoes: Number(r.avaliacoes) || 0,
    })),
    porCompetencia: porCompetencia.rows.map((r) => ({
      codigo: r.codigo, descricao: r.descricao, disciplina: r.disciplina, qtd: Number(r.qtd) || 0,
    })),
  };
}
