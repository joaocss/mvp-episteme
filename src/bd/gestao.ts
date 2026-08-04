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

export interface ExtrasUsuario {
  dataNascimento?: string | null;
  disciplinas?: string | null;
  enderecoFamilia?: string | null;
  estadoCivilPais?: string | null;
  paisMoramJuntos?: boolean | null;
}

export async function criarUsuario(
  escolaId: string, papel: "professor" | "aluno", nome: string, email: string, senha: string,
  extras: ExtrasUsuario = {},
): Promise<string> {
  const { rows } = await pool.query(
    `insert into usuarios
       (escola_id, papel, nome, email, senha_hash, data_nascimento, disciplinas,
        endereco_familia, estado_civil_pais, pais_moram_juntos)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
    [escolaId, papel, nome, email, gerarHashSenha(senha), extras.dataNascimento || null, extras.disciplinas || null,
     extras.enderecoFamilia || null, extras.estadoCivilPais || null, extras.paisMoramJuntos ?? null],
  );
  return rows[0].id;
}

export async function editarUsuario(
  escolaId: string, id: string, nome: string, email: string, extras: ExtrasUsuario = {},
): Promise<void> {
  await pool.query(
    `update usuarios set nome = $3, email = $4, data_nascimento = $5, disciplinas = $6,
       endereco_familia = $7, estado_civil_pais = $8, pais_moram_juntos = $9
     where id = $2 and escola_id = $1`,
    [escolaId, id, nome, email, extras.dataNascimento || null, extras.disciplinas || null,
     extras.enderecoFamilia || null, extras.estadoCivilPais || null, extras.paisMoramJuntos ?? null],
  );
}

// ------------------------------------------------------------ responsaveis

export interface Responsavel {
  id: string; nome: string; parentesco: string; telefone: string | null; email: string | null;
}

export async function listarResponsaveis(escolaId: string, alunoId: string): Promise<Responsavel[]> {
  const { rows } = await pool.query(
    `select id, nome, parentesco, telefone, email from responsaveis
     where escola_id = $1 and aluno_id = $2 order by criado_em`,
    [escolaId, alunoId],
  );
  return rows;
}

export async function adicionarResponsavel(
  escolaId: string, alunoId: string, nome: string, parentesco: string,
  telefone: string | null, email: string | null,
): Promise<string> {
  const { rows } = await pool.query(
    `insert into responsaveis (escola_id, aluno_id, nome, parentesco, telefone, email)
     values ($1,$2,$3,$4,$5,$6) returning id`,
    [escolaId, alunoId, nome, parentesco, telefone || null, email || null],
  );
  return rows[0].id;
}

export async function editarResponsavel(
  escolaId: string, id: string, nome: string, parentesco: string,
  telefone: string | null, email: string | null,
): Promise<void> {
  await pool.query(
    `update responsaveis set nome = $3, parentesco = $4, telefone = $5, email = $6
     where id = $2 and escola_id = $1`,
    [escolaId, id, nome, parentesco, telefone || null, email || null],
  );
}

export async function excluirResponsavel(escolaId: string, id: string): Promise<void> {
  await pool.query(`delete from responsaveis where id = $2 and escola_id = $1`, [escolaId, id]);
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

// Reenturmacao em lote (virada de ano): move varios alunos para a turma destino.
// turmaDestinoId nulo desmatricula todos. Roda em transacao. Retorna quantos moveu.
export async function reenturmarAlunos(
  escolaId: string, alunoIds: string[], turmaDestinoId: string | null,
): Promise<number> {
  if (alunoIds.length === 0) return 0;
  const cliente = await pool.connect();
  try {
    await cliente.query("begin");
    await cliente.query(
      `delete from matriculas where escola_id = $1 and aluno_id = any($2::uuid[])`,
      [escolaId, alunoIds],
    );
    if (turmaDestinoId) {
      // Confirma que a turma destino e da mesma escola (defesa de isolamento).
      const t = await cliente.query(`select 1 from turmas where id = $1 and escola_id = $2`, [turmaDestinoId, escolaId]);
      if (!t.rows[0]) throw new Error("turma destino invalida");
      for (const alunoId of alunoIds) {
        await cliente.query(
          `insert into matriculas (escola_id, aluno_id, turma_id) values ($1,$2,$3)
           on conflict (aluno_id, turma_id) do nothing`,
          [escolaId, alunoId, turmaDestinoId],
        );
      }
    }
    await cliente.query("commit");
    return alunoIds.length;
  } catch (e) {
    await cliente.query("rollback");
    throw e;
  } finally {
    cliente.release();
  }
}

export async function vincularProfessorTurma(
  escolaId: string, professorId: string, turmaId: string, disciplina = "matematica",
): Promise<void> {
  await pool.query(
    `insert into professores_turmas (escola_id, professor_id, turma_id, disciplina)
     values ($1,$2,$3,$4) on conflict (professor_id, turma_id, disciplina) do nothing`,
    [escolaId, professorId, turmaId, disciplina],
  );
}

export async function desvincularProfessorTurma(
  escolaId: string, professorId: string, turmaId: string, disciplina?: string,
): Promise<void> {
  if (disciplina) {
    await pool.query(
      `delete from professores_turmas where escola_id = $1 and professor_id = $2 and turma_id = $3 and disciplina = $4`,
      [escolaId, professorId, turmaId, disciplina],
    );
  } else {
    await pool.query(
      `delete from professores_turmas where escola_id = $1 and professor_id = $2 and turma_id = $3`,
      [escolaId, professorId, turmaId],
    );
  }
}

export interface TurmaLista { id: string; nome: string; serie: string; anoLetivo: number; alunos: number; modoEstrito: boolean; }
export async function listarTurmas(escolaId: string): Promise<TurmaLista[]> {
  const { rows } = await pool.query(
    `select t.id, t.nome, t.serie, t.ano_letivo, t.modo_estrito, count(m.id) as alunos
     from turmas t left join matriculas m on m.turma_id = t.id
     where t.escola_id = $1 group by t.id order by t.nome`, [escolaId]);
  return rows.map((r) => ({
    id: r.id, nome: r.nome, serie: r.serie, anoLetivo: r.ano_letivo,
    alunos: Number(r.alunos) || 0, modoEstrito: Boolean(r.modo_estrito),
  }));
}

// Modo estrito da turma: quando ligado, o tutor so responde com base no material
// vinculado a turma (bloqueia o fallback BNCC/conhecimento geral). Decisao do gestor.
export async function definirModoEstrito(escolaId: string, turmaId: string, ativo: boolean): Promise<void> {
  await pool.query(
    `update turmas set modo_estrito = $3 where id = $2 and escola_id = $1`,
    [escolaId, turmaId, ativo],
  );
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
  enderecoFamilia: string | null; estadoCivilPais: string | null; paisMoramJuntos: boolean | null;
}
export async function listarAlunosGeral(escolaId: string): Promise<AlunoLista[]> {
  const { rows } = await pool.query(
    `select u.id, u.nome, u.email, u.data_nascimento, u.endereco_familia, u.estado_civil_pais, u.pais_moram_juntos,
            t.id as turma_id, t.nome as turma
     from usuarios u
     left join matriculas m on m.aluno_id = u.id
     left join turmas t on t.id = m.turma_id
     where u.escola_id = $1 and u.papel = 'aluno' order by u.nome`, [escolaId]);
  return rows.map((r) => ({
    id: r.id, nome: r.nome, email: r.email, turma: r.turma, turmaId: r.turma_id ?? null,
    dataNascimento: r.data_nascimento ? new Date(r.data_nascimento).toISOString().slice(0, 10) : null,
    enderecoFamilia: r.endereco_familia ?? null, estadoCivilPais: r.estado_civil_pais ?? null,
    paisMoramJuntos: r.pais_moram_juntos ?? null,
  }));
}
