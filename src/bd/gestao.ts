// Gestao (cadastro) — usado pelo gestor: turmas, professores, alunos e vinculos.
import pg from "pg";
import { gerarHashSenha } from "../../lib/senha";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function criarTurma(escolaId: string, nome: string, anoLetivo: number, serie: string): Promise<void> {
  await pool.query(
    `insert into turmas (escola_id, nome, ano_letivo, serie) values ($1,$2,$3,$4)`,
    [escolaId, nome, anoLetivo, serie],
  );
}

export async function criarUsuario(
  escolaId: string, papel: "professor" | "aluno", nome: string, email: string, senha: string,
): Promise<string> {
  const { rows } = await pool.query(
    `insert into usuarios (escola_id, papel, nome, email, senha_hash) values ($1,$2,$3,$4,$5) returning id`,
    [escolaId, papel, nome, email, gerarHashSenha(senha)],
  );
  return rows[0].id;
}

export async function matricularAluno(escolaId: string, alunoId: string, turmaId: string): Promise<void> {
  await pool.query(
    `insert into matriculas (escola_id, aluno_id, turma_id) values ($1,$2,$3)
     on conflict (aluno_id, turma_id) do nothing`,
    [escolaId, alunoId, turmaId],
  );
}

export async function vincularProfessorTurma(escolaId: string, professorId: string, turmaId: string): Promise<void> {
  await pool.query(
    `insert into professores_turmas (escola_id, professor_id, turma_id, disciplina)
     values ($1,$2,$3,'matematica') on conflict (professor_id, turma_id, disciplina) do nothing`,
    [escolaId, professorId, turmaId],
  );
}

export interface TurmaLista { id: string; nome: string; serie: string; anoLetivo: number; alunos: number; }
export async function listarTurmas(escolaId: string): Promise<TurmaLista[]> {
  const { rows } = await pool.query(
    `select t.id, t.nome, t.serie, t.ano_letivo, count(m.id) as alunos
     from turmas t left join matriculas m on m.turma_id = t.id
     where t.escola_id = $1 group by t.id order by t.nome`, [escolaId]);
  return rows.map((r) => ({ id: r.id, nome: r.nome, serie: r.serie, anoLetivo: r.ano_letivo, alunos: Number(r.alunos) || 0 }));
}

export interface ProfessorLista { id: string; nome: string; email: string; turmas: number; }
export async function listarProfessores(escolaId: string): Promise<ProfessorLista[]> {
  const { rows } = await pool.query(
    `select u.id, u.nome, u.email, count(pt.id) as turmas
     from usuarios u left join professores_turmas pt on pt.professor_id = u.id
     where u.escola_id = $1 and u.papel = 'professor' group by u.id order by u.nome`, [escolaId]);
  return rows.map((r) => ({ id: r.id, nome: r.nome, email: r.email, turmas: Number(r.turmas) || 0 }));
}

export interface AlunoLista { id: string; nome: string; email: string; turma: string | null; }
export async function listarAlunosGeral(escolaId: string): Promise<AlunoLista[]> {
  const { rows } = await pool.query(
    `select u.id, u.nome, u.email, t.nome as turma
     from usuarios u
     left join matriculas m on m.aluno_id = u.id
     left join turmas t on t.id = m.turma_id
     where u.escola_id = $1 and u.papel = 'aluno' order by u.nome`, [escolaId]);
  return rows.map((r) => ({ id: r.id, nome: r.nome, email: r.email, turma: r.turma }));
}
