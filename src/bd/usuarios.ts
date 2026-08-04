// Consultas basicas de usuario (nome/email/papel) usadas pelo shell do app.
import { pool } from "./pool";

export interface UsuarioBasico {
  id: string;
  nome: string;
  email: string;
  papel: string;
}

// Busca o usuario pelo id, sempre restrito a escola (isolamento multi-tenant).
export async function obterUsuarioBasico(
  escolaId: string,
  usuarioId: string,
): Promise<UsuarioBasico | null> {
  const { rows } = await pool.query(
    `select id, nome, email, papel from usuarios where id = $1 and escola_id = $2`,
    [usuarioId, escolaId],
  );
  const r = rows[0];
  return r ? { id: r.id, nome: r.nome, email: r.email, papel: r.papel } : null;
}
