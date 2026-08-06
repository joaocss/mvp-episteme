// Painel do Responsavel (read-only). O vinculo responsavel->aluno reusa a tabela
// `responsaveis` (Fase 5): o responsavel loga com um usuario papel='responsavel'
// e enxerga os alunos cujo registro em `responsaveis` tem o MESMO email. Sem
// tabela nova: o email e a chave de ligacao. Isolamento sempre por escola_id.
import { pool } from "./pool";

export interface FilhoVinculado { alunoId: string; nome: string; turma: string | null; serie: string | null; parentesco: string }

// Alunos vinculados ao responsavel (por email do registro em responsaveis).
export async function filhosDoResponsavel(escolaId: string, email: string): Promise<FilhoVinculado[]> {
  const { rows } = await pool.query(
    `select distinct on (u.id)
            u.id as aluno_id, u.nome, t.nome as turma, t.serie, r.parentesco
     from responsaveis r
     join usuarios u on u.id = r.aluno_id
     left join matriculas m on m.aluno_id = u.id
     left join turmas t on t.id = m.turma_id
     where r.escola_id = $1 and lower(r.email) = lower($2)
     order by u.id, u.nome`,
    [escolaId, email],
  );
  return rows.map((r) => ({
    alunoId: r.aluno_id, nome: r.nome, turma: r.turma ?? null, serie: r.serie ?? null, parentesco: r.parentesco,
  }));
}

export interface NotaRecente { disciplina: string; descricao: string; valor: number; notaMaxima: number; data: string }
export interface ResumoFilho {
  faltasJustificadas: number;
  faltasNaoJustificadas: number;
  notasRecentes: NotaRecente[];
  ultimaAtividadeTutor: string | null;
  treinosConcluidos: number;
}

// Resumo read-only de um filho — valida o vinculo pelo email antes de expor dados.
export async function resumoFilho(escolaId: string, email: string, alunoId: string): Promise<ResumoFilho | null> {
  const vinculo = await pool.query(
    `select 1 from responsaveis where escola_id = $1 and aluno_id = $3 and lower(email) = lower($2) limit 1`,
    [escolaId, email, alunoId],
  );
  if (!vinculo.rows[0]) return null;

  const [faltas, notas, tutor, treinos] = await Promise.all([
    pool.query(
      `select situacao, count(*) as n from faltas where escola_id = $1 and aluno_id = $2 group by situacao`,
      [escolaId, alunoId]),
    pool.query(
      `select disciplina, descricao, valor, nota_maxima, data_lancamento
       from notas where escola_id = $1 and aluno_id = $2 order by data_lancamento desc limit 5`,
      [escolaId, alunoId]),
    pool.query(
      `select max(i.criado_em) as ultima
       from interacoes i join sessoes_tutor s on s.id = i.sessao_id
       where i.escola_id = $1 and s.aluno_id = $2`,
      [escolaId, alunoId]),
    pool.query(
      `select count(*) as n from treino_sessoes where escola_id = $1 and aluno_id = $2 and status = 'concluido'`,
      [escolaId, alunoId]),
  ]);

  const faltasMap = Object.fromEntries(faltas.rows.map((r) => [r.situacao, Number(r.n) || 0]));
  return {
    faltasJustificadas: faltasMap["justificada"] ?? 0,
    faltasNaoJustificadas: faltasMap["nao_justificada"] ?? 0,
    notasRecentes: notas.rows.map((r) => ({
      disciplina: r.disciplina, descricao: r.descricao, valor: Number(r.valor),
      notaMaxima: Number(r.nota_maxima), data: new Date(r.data_lancamento).toISOString().slice(0, 10),
    })),
    ultimaAtividadeTutor: tutor.rows[0]?.ultima ? new Date(tutor.rows[0].ultima).toISOString() : null,
    treinosConcluidos: Number(treinos.rows[0]?.n) || 0,
  };
}
