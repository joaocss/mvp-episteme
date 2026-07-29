// Consulta e cadastro simples de alunos (via Postgres direto). Para o MVP,
// todo aluno cadastrado entra na turma de 6o ano da escola de demonstracao.
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const ESCOLA_DEMO = "00000000-0000-0000-0000-000000000001";
const TURMA_6ANO = "00000000-0000-0000-0000-000000000020";

export interface Aluno {
  id: string;
  escolaId: string;
  nome: string;
}

export async function buscarAlunoPorEmail(email: string): Promise<Aluno | null> {
  const { rows } = await pool.query(
    `select u.id, u.escola_id, u.nome
       from usuarios u
       join matriculas m on m.aluno_id = u.id
       join turmas t on t.id = m.turma_id
      where lower(u.email) = lower($1)
        and u.papel = 'aluno'
        and t.serie = '6o ano'
      limit 1`,
    [email],
  );
  if (!rows[0]) return null;
  return { id: rows[0].id, escolaId: rows[0].escola_id, nome: rows[0].nome };
}

export async function criarAluno(email: string, nome: string): Promise<Aluno> {
  const existente = await pool.query(
    `select id, escola_id from usuarios where lower(email) = lower($1) limit 1`,
    [email],
  );
  let alunoId: string;
  let escolaId: string;
  if (existente.rows[0]) {
    alunoId = existente.rows[0].id;
    escolaId = existente.rows[0].escola_id;
  } else {
    const ins = await pool.query(
      `insert into usuarios (escola_id, papel, nome, email)
       values ($1, 'aluno', $2, $3) returning id`,
      [ESCOLA_DEMO, nome, email],
    );
    alunoId = ins.rows[0].id;
    escolaId = ESCOLA_DEMO;
  }
  await pool.query(
    `insert into matriculas (escola_id, aluno_id, turma_id)
     values ($1, $2, $3) on conflict (aluno_id, turma_id) do nothing`,
    [escolaId, alunoId, TURMA_6ANO],
  );
  return { id: alunoId, escolaId, nome };
}
