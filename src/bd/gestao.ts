// Gestao (cadastro) — usado pelo gestor: turmas, professores, alunos e vinculos.
// Todas as escritas passam pelo pool privilegiado; por isso SEMPRE restringimos
// por escola_id no WHERE para preservar o isolamento entre escolas (tenants).
import { pool } from "./pool";
import { gerarHashSenha } from "../../lib/senha";

export async function criarTurma(escolaId: string, nome: string, anoLetivo: number, serie: string): Promise<void> {
  await pool.query(
    `insert into turmas (escola_id, nome, ano_letivo, serie) values ($1,$2,$3,$4)`,
    [escolaId, nome, anoLetivo, serie],
  );
}

export async function editarTurma(
  escolaId: string, id: string, nome: string, serie: string, anoLetivo: number,
): Promise<void> {
  await pool.query(
    `update turmas set nome = $3, serie = $4, ano_letivo = $5 where id = $2 and escola_id = $1`,
    [escolaId, id, nome, serie, anoLetivo],
  );
}

export async function excluirTurma(escolaId: string, id: string): Promise<void> {
  // matriculas e professores_turmas caem por cascade (FK on delete cascade).
  await pool.query(`delete from turmas where id = $2 and escola_id = $1`, [escolaId, id]);
}

export interface ExtrasUsuario { dataNascimento?: string | null; disciplinas?: string | null; }

export async function criarUsuario(
  escolaId: string, papel: "professor" | "aluno", nome: string, email: string, senha: string,
  extras: ExtrasUsuario = {},
): Promise<string> {
  const { rows } = await pool.query(
    `insert into usuarios (escola_id, papel, nome, email, senha_hash, data_nascimento, disciplinas)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [escolaId, papel, nome, email, gerarHashSenha(senha), extras.dataNascimento || null, extras.disciplinas || null],
  );
  return rows[0].id;
}

export async function editarUsuario(
  escolaId: string, id: string, nome: string, email: string, extras: ExtrasUsuario = {},
): Promise<void> {
  await pool.query(
    `update usuarios set nome = $3, email = $4, data_nascimento = $5, disciplinas = $6
     where id = $2 and escola_id = $1`,
    [escolaId, id, nome, email, extras.dataNascimento || null, extras.disciplinas || null],
  );
}

export async function excluirUsuario(escolaId: string, id: string): Promise<void> {
  // matriculas, professores_turmas, sessoes/interacoes caem por cascade.
  await pool.query(`delete from usuarios where id = $2 and escola_id = $1`, [escolaId, id]);
}

export async function matricularAluno(escolaId: string, alunoId: string, turmaId: string): Promise<void> {
  await pool.query(
    `insert into matriculas (escola_id, aluno_id, turma_id) values ($1,$2,$3)
     on conflict (aluno_id, turma_id) do nothing`,
    [escolaId, alunoId, turmaId],
  );
}

// Define (ou troca) a turma do aluno: remove matriculas atuais e cria a nova.
// turmaId nulo apenas desmatricula.
export async function definirTurmaAluno(escolaId: string, alunoId: string, turmaId: string | null): Promise<void> {
  await pool.query(`delete from matriculas where aluno_id = $2 and escola_id = $1`, [escolaId, alunoId]);
  if (turmaId) await matricularAluno(escolaId, alunoId, turmaId);
}

export async function vincularProfessorTurma(escolaId: string, professorId: string, turmaId: string): Promise<void> {
  await pool.query(
    `insert into professores_turmas (escola_id, professor_id, turma_id, disciplina)
     values ($1,$2,$3,'matematica') on conflict (professor_id, turma_id, disciplina) do nothing`,
    [escolaId, professorId, turmaId],
  );
}

export async function desvincularProfessorTurma(escolaId: string, professorId: string, turmaId: string): Promise<void> {
  await pool.query(
    `delete from professores_turmas where escola_id = $1 and professor_id = $2 and turma_id = $3`,
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

export interface ProfessorLista { id: string; nome: string; email: string; disciplinas: string | null; turmas: number; }
export async function listarProfessores(escolaId: string): Promise<ProfessorLista[]> {
  const { rows } = await pool.query(
    `select u.id, u.nome, u.email, u.disciplinas, count(pt.id) as turmas
     from usuarios u left join professores_turmas pt on pt.professor_id = u.id
     where u.escola_id = $1 and u.papel = 'professor' group by u.id order by u.nome`, [escolaId]);
  return rows.map((r) => ({
    id: r.id, nome: r.nome, email: r.email, disciplinas: r.disciplinas ?? null, turmas: Number(r.turmas) || 0,
  }));
}

export interface AlunoLista {
  id: string; nome: string; email: string; turma: string | null; turmaId: string | null; dataNascimento: string | null;
}
export async function listarAlunosGeral(escolaId: string): Promise<AlunoLista[]> {
  const { rows } = await pool.query(
    `select u.id, u.nome, u.email, u.data_nascimento, t.id as turma_id, t.nome as turma
     from usuarios u
     left join matriculas m on m.aluno_id = u.id
     left join turmas t on t.id = m.turma_id
     where u.escola_id = $1 and u.papel = 'aluno' order by u.nome`, [escolaId]);
  return rows.map((r) => ({
    id: r.id, nome: r.nome, email: r.email, turma: r.turma, turmaId: r.turma_id ?? null,
    dataNascimento: r.data_nascimento ? new Date(r.data_nascimento).toISOString().slice(0, 10) : null,
  }));
}
