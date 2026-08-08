// Consultas basicas de usuario (nome/email/papel) usadas pelo shell do app.
import { pool } from "./pool";
import { gerarHashSenha } from "../../lib/senha";

export interface UsuarioBasico {
  id: string;
  nome: string;
  email: string;
  papel: string;
}

// Define/redefine a senha de um usuario (usado pelo fluxo de convite/reset).
export async function definirSenha(usuarioId: string, senha: string): Promise<void> {
  await pool.query(
    `update usuarios set senha_hash = $2 where id = $1`,
    [usuarioId, gerarHashSenha(senha)],
  );
}

export interface UsuarioPorEmail {
  id: string;
  escolaId: string;
  nome: string;
  papel: string;
  escolaNome: string;
}

// Usuarios com este email. O email NAO e unico (pode haver contas em escolas
// diferentes), entao o reset trata a lista toda. Case-insensitive.
export async function buscarUsuariosPorEmail(email: string): Promise<UsuarioPorEmail[]> {
  const alvo = email.trim();
  if (!alvo) return [];
  const { rows } = await pool.query(
    `select u.id, u.escola_id, u.nome, u.papel, e.nome as escola_nome
       from usuarios u join escolas e on e.id = u.escola_id
      where lower(u.email) = lower($1)`,
    [alvo],
  );
  return rows.map((r) => ({
    id: r.id, escolaId: r.escola_id, nome: r.nome, papel: r.papel, escolaNome: r.escola_nome,
  }));
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
