// Catalogo de disciplinas por escola (o gestor cria/edita/remove). O slug (sem
// acento) e o valor gravado em materiais_fonte.disciplina, provas.disciplina e
// sessoes_tutor.disciplina; o nome e apenas o rotulo amigavel exibido na UI.
// Todas as escritas passam pelo pool privilegiado; SEMPRE filtrar por escola_id.
import { pool } from "./pool";

export interface Disciplina { id: string; nome: string; slug: string; }

// Normaliza um nome em slug: minusculo, sem acento, sem espacos duplicados.
export function gerarSlug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (marcas combinantes)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function listarDisciplinas(escolaId: string): Promise<Disciplina[]> {
  const { rows } = await pool.query(
    `select id, nome, slug from disciplinas where escola_id = $1 order by nome`,
    [escolaId],
  );
  return rows.map((r) => ({ id: r.id, nome: r.nome, slug: r.slug }));
}

export async function criarDisciplina(escolaId: string, nome: string): Promise<Disciplina> {
  const slug = gerarSlug(nome);
  if (!slug) throw new Error("Nome de disciplina invalido");
  const { rows } = await pool.query(
    `insert into disciplinas (escola_id, nome, slug) values ($1, $2, $3)
     on conflict (escola_id, slug) do update set nome = excluded.nome
     returning id, nome, slug`,
    [escolaId, nome.trim(), slug],
  );
  return { id: rows[0].id, nome: rows[0].nome, slug: rows[0].slug };
}

export async function editarDisciplina(escolaId: string, id: string, nome: string): Promise<void> {
  // Nao mexemos no slug ao renomear: ele ja esta gravado nos materiais/provas.
  await pool.query(
    `update disciplinas set nome = $3 where id = $2 and escola_id = $1`,
    [escolaId, id, nome.trim()],
  );
}

export async function excluirDisciplina(escolaId: string, id: string): Promise<void> {
  await pool.query(`delete from disciplinas where id = $2 and escola_id = $1`, [escolaId, id]);
}
