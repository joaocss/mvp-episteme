// Consulta e cadastro de usuarios/alunos (Postgres direto), com senha (piloto).
import { pool } from "./pool";
import { gerarHashSenha } from "../../lib/senha";

const ESCOLA_DEMO = "00000000-0000-0000-0000-000000000001";
const TURMA_6ANO = "00000000-0000-0000-0000-000000000020";

export interface Aluno { id: string; escolaId: string; nome: string; }
export interface Usuario { id: string; escolaId: string; papel: string; nome: string; senhaHash: string | null; }

export async function buscarUsuarioPorEmail(email: string): Promise<Usuario | null> {
  const { rows } = await pool.query(
    `select id, escola_id, papel, nome, senha_hash from usuarios where lower(email) = lower($1) limit 1`,
    [email],
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id, escolaId: rows[0].escola_id, papel: rows[0].papel,
    nome: rows[0].nome, senhaHash: rows[0].senha_hash,
  };
}

export async function criarAluno(email: string, nome: string, senha: string): Promise<Aluno> {
  const hash = gerarHashSenha(senha);
  const existente = await pool.query(
    `select id, escola_id from usuarios where lower(email) = lower($1) limit 1`,
    [email],
  );
  let alunoId: string;
  let escolaId: string;
  if (existente.rows[0]) {
    alunoId = existente.rows[0].id;
    escolaId = existente.rows[0].escola_id;
    await pool.query(`update usuarios set senha_hash = $1 where id = $2`, [hash, alunoId]);
  } else {
    const ins = await pool.query(
      `insert into usuarios (escola_id, papel, nome, email, senha_hash)
       values ($1, 'aluno', $2, $3, $4) returning id`,
      [ESCOLA_DEMO, nome, email, hash],
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
