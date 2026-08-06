// Inscricoes de Web Push por usuario. Escritas pelo pool privilegiado; sempre
// filtrar por escola_id. Deploy-safe onde faz sentido.
import { pool } from "./pool";

export interface InscricaoPush { endpoint: string; p256dh: string; auth: string }

export async function salvarInscricao(
  escolaId: string, usuarioId: string, i: InscricaoPush,
): Promise<void> {
  await pool.query(
    `insert into push_inscricoes (escola_id, usuario_id, endpoint, p256dh, auth)
     values ($1,$2,$3,$4,$5)
     on conflict (endpoint) do update set usuario_id = excluded.usuario_id,
       escola_id = excluded.escola_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    [escolaId, usuarioId, i.endpoint, i.p256dh, i.auth],
  );
}

export async function removerInscricao(endpoint: string): Promise<void> {
  await pool.query(`delete from push_inscricoes where endpoint = $1`, [endpoint]);
}

// Inscricoes dos ALUNOS de uma turma (para avisar sobre novo treino/prova).
export async function inscricoesDosAlunosDaTurma(
  escolaId: string, turmaId: string,
): Promise<InscricaoPush[]> {
  const { rows } = await pool.query(
    `select pi.endpoint, pi.p256dh, pi.auth
     from push_inscricoes pi
     join matriculas m on m.aluno_id = pi.usuario_id
     where pi.escola_id = $1 and m.turma_id = $2`,
    [escolaId, turmaId],
  );
  return rows.map((r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }));
}

// Inscricoes de um usuario especifico.
export async function inscricoesDoUsuario(escolaId: string, usuarioId: string): Promise<InscricaoPush[]> {
  const { rows } = await pool.query(
    `select endpoint, p256dh, auth from push_inscricoes where escola_id = $1 and usuario_id = $2`,
    [escolaId, usuarioId],
  );
  return rows.map((r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }));
}
