// Notas e faltas lancadas manualmente (professor). Toda escrita passa pelo
// pool privilegiado; por isso SEMPRE restringimos por escola_id e, nas
// exclusoes, por professor_id (so quem lancou apaga).
import { pool } from "./pool";

export async function lancarNota(
  escolaId: string, professorId: string, alunoId: string, turmaId: string,
  descricao: string, valor: number, notaMaxima: number, disciplina = "matematica", provaId: string | null = null,
): Promise<string> {
  const { rows } = await pool.query(
    `insert into notas (escola_id, aluno_id, turma_id, professor_id, prova_id, disciplina, descricao, valor, nota_maxima)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
    [escolaId, alunoId, turmaId, professorId, provaId, disciplina, descricao, valor, notaMaxima],
  );
  return rows[0].id;
}

export async function excluirNota(escolaId: string, professorId: string, notaId: string): Promise<void> {
  await pool.query(
    `delete from notas where id = $3 and escola_id = $1 and professor_id = $2`,
    [escolaId, professorId, notaId],
  );
}

export interface NotaAluno {
  id: string; aluno: string; alunoId: string; descricao: string; valor: number; notaMaxima: number; data: string;
}

export async function notasDaTurma(escolaId: string, turmaId: string): Promise<NotaAluno[]> {
  const { rows } = await pool.query(
    `select n.id, u.nome as aluno, n.aluno_id, n.descricao, n.valor, n.nota_maxima, n.data_lancamento
     from notas n join usuarios u on u.id = n.aluno_id
     where n.escola_id = $1 and n.turma_id = $2
     order by n.data_lancamento desc, u.nome`,
    [escolaId, turmaId],
  );
  return rows.map((r) => ({
    id: r.id, aluno: r.aluno, alunoId: r.aluno_id, descricao: r.descricao,
    valor: Number(r.valor), notaMaxima: Number(r.nota_maxima),
    data: new Date(r.data_lancamento).toLocaleDateString("pt-BR"),
  }));
}

export async function registrarFalta(
  escolaId: string, professorId: string, alunoId: string, turmaId: string,
  data: string, situacao: "justificada" | "nao_justificada", motivo: string | null,
): Promise<string> {
  const { rows } = await pool.query(
    `insert into faltas (escola_id, aluno_id, turma_id, professor_id, data_falta, situacao, motivo)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [escolaId, alunoId, turmaId, professorId, data, situacao, motivo || null],
  );
  return rows[0].id;
}

export async function excluirFalta(escolaId: string, professorId: string, faltaId: string): Promise<void> {
  await pool.query(
    `delete from faltas where id = $3 and escola_id = $1 and professor_id = $2`,
    [escolaId, professorId, faltaId],
  );
}

export interface FaltaAluno {
  id: string; aluno: string; alunoId: string; data: string; situacao: "justificada" | "nao_justificada"; motivo: string | null;
}

export async function faltasDaTurma(escolaId: string, turmaId: string): Promise<FaltaAluno[]> {
  const { rows } = await pool.query(
    `select f.id, u.nome as aluno, f.aluno_id, f.data_falta, f.situacao, f.motivo
     from faltas f join usuarios u on u.id = f.aluno_id
     where f.escola_id = $1 and f.turma_id = $2
     order by f.data_falta desc, u.nome`,
    [escolaId, turmaId],
  );
  return rows.map((r) => ({
    id: r.id, aluno: r.aluno, alunoId: r.aluno_id,
    data: new Date(r.data_falta).toLocaleDateString("pt-BR"), situacao: r.situacao, motivo: r.motivo ?? null,
  }));
}

// ---------------------------------------------------- dashboard de desempenho

export interface DesempenhoAlunoProva {
  provaId: string; tituloProva: string; turma: string; aluno: string; alunoId: string;
  acertosObjetivas: number; totalObjetivas: number; notaMedia: number;
}

// filtroTurmasIds: undefined = todas as turmas da escola (uso do gestor).
async function desempenhoProvas(escolaId: string, filtroTurmasIds?: string[]): Promise<DesempenhoAlunoProva[]> {
  const params: unknown[] = [escolaId];
  let filtro = "";
  if (filtroTurmasIds) {
    if (filtroTurmasIds.length === 0) return [];
    params.push(filtroTurmasIds);
    filtro = ` and p.turma_id = any($${params.length}::uuid[])`;
  }
  const { rows } = await pool.query(
    `select p.id as prova_id, p.titulo, t.nome as turma, u.nome as aluno, u.id as aluno_id,
       count(*) filter (where q.tipo = 'objetiva') as total_objetivas,
       count(*) filter (where q.tipo = 'objetiva' and r.correta) as acertos,
       avg(coalesce(r.nota_efetiva, r.nota)) as nota_media
     from respostas r
     join questoes q on q.id = r.questao_id
     join provas p on p.id = q.prova_id
     join turmas t on t.id = p.turma_id
     join usuarios u on u.id = r.aluno_id
     where p.escola_id = $1 and p.status in ('publicada','encerrada')${filtro}
     group by p.id, p.titulo, t.nome, u.nome, u.id
     order by t.nome, p.titulo, u.nome`,
    params,
  );
  return rows.map((r) => ({
    provaId: r.prova_id, tituloProva: r.titulo, turma: r.turma, aluno: r.aluno, alunoId: r.aluno_id,
    acertosObjetivas: Number(r.acertos) || 0, totalObjetivas: Number(r.total_objetivas) || 0,
    notaMedia: Number(Number(r.nota_media).toFixed(2)) || 0,
  }));
}

export async function desempenhoProvasEscola(escolaId: string): Promise<DesempenhoAlunoProva[]> {
  return desempenhoProvas(escolaId);
}

export async function desempenhoProvasProfessor(escolaId: string, professorId: string): Promise<DesempenhoAlunoProva[]> {
  const { rows } = await pool.query(
    `select distinct turma_id from professores_turmas where escola_id = $1 and professor_id = $2`,
    [escolaId, professorId],
  );
  return desempenhoProvas(escolaId, rows.map((r) => r.turma_id));
}
