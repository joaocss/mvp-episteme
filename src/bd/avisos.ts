// Avisos/comunicados por audiencia. Escritas pelo pool privilegiado; sempre
// filtrar por escola_id.
import { pool } from "./pool";

export type PapelAudiencia = "aluno" | "professor" | "gestor";

export interface Aviso {
  id: string; titulo: string; corpo: string; audiencia: string[]; turmaId: string | null;
  turmaNome?: string | null; autorNome?: string | null; criadoEm: string;
}

export async function criarAviso(
  escolaId: string, autorId: string, titulo: string, corpo: string,
  audiencia: PapelAudiencia[], turmaId: string | null,
): Promise<string> {
  const { rows } = await pool.query(
    `insert into avisos (escola_id, autor_id, titulo, corpo, audiencia, turma_id)
     values ($1,$2,$3,$4,$5,$6) returning id`,
    [escolaId, autorId, titulo, corpo, audiencia, turmaId],
  );
  return rows[0].id;
}

// Avisos que um usuario deve ver: audiencia inclui o papel dele e (turma nula
// ou = turma do usuario). turmaDoUsuario null para professor/gestor.
export async function listarAvisosParaUsuario(
  escolaId: string, papel: string, turmaId: string | null,
): Promise<Aviso[]> {
  const { rows } = await pool.query(
    `select a.id, a.titulo, a.corpo, a.audiencia, a.turma_id, a.criado_em,
            t.nome as turma_nome, u.nome as autor_nome
     from avisos a
     left join turmas t on t.id = a.turma_id
     left join usuarios u on u.id = a.autor_id
     where a.escola_id = $1
       and $2 = any(a.audiencia)
       and (a.turma_id is null or a.turma_id = $3)
     order by a.criado_em desc limit 100`,
    [escolaId, papel, turmaId],
  );
  return rows.map(mapear);
}

// Todos os avisos da escola (visao do gestor).
export async function listarAvisosDaEscola(escolaId: string): Promise<Aviso[]> {
  const { rows } = await pool.query(
    `select a.id, a.titulo, a.corpo, a.audiencia, a.turma_id, a.criado_em,
            t.nome as turma_nome, u.nome as autor_nome
     from avisos a
     left join turmas t on t.id = a.turma_id
     left join usuarios u on u.id = a.autor_id
     where a.escola_id = $1 order by a.criado_em desc limit 100`,
    [escolaId],
  );
  return rows.map(mapear);
}

export async function excluirAviso(escolaId: string, id: string): Promise<void> {
  await pool.query(`delete from avisos where escola_id = $1 and id = $2`, [escolaId, id]);
}

// Destinatarios (usuario_id + email) para push/e-mail, conforme a audiencia.
export async function destinatariosDoAviso(
  escolaId: string, audiencia: PapelAudiencia[], turmaId: string | null,
): Promise<{ usuarioId: string; email: string | null }[]> {
  if (audiencia.length === 0) return [];
  // Alunos: se turmaId setado, so os da turma; senao todos os alunos.
  // Professores/gestores: todos da escola com o papel (independente de turma).
  const { rows } = await pool.query(
    `select distinct u.id, u.email
     from usuarios u
     left join matriculas m on m.aluno_id = u.id
     where u.escola_id = $1
       and u.papel = any($2)
       and (
         u.papel <> 'aluno'
         or $3::uuid is null
         or m.turma_id = $3
       )`,
    [escolaId, audiencia, turmaId],
  );
  return rows.map((r) => ({ usuarioId: r.id, email: r.email ?? null }));
}

function mapear(r: any): Aviso {
  return {
    id: r.id, titulo: r.titulo, corpo: r.corpo, audiencia: r.audiencia ?? [],
    turmaId: r.turma_id ?? null, turmaNome: r.turma_nome ?? null, autorNome: r.autor_nome ?? null,
    criadoEm: new Date(r.criado_em).toISOString(),
  };
}
