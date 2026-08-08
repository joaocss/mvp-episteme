// Tokens de senha (convite + reset). Guardamos so o HASH (sha256) do token; o
// token cru so existe no link enviado por email. Uso unico + expiracao. Todo o
// acesso e pelo pool privilegiado do servidor (o fluxo e publico, sem sessao).
import crypto from "node:crypto";
import { pool } from "./pool";

export type TipoToken = "convite" | "reset";

// Convite dura dias (o pai/aluno pode demorar a abrir); reset dura pouco.
const VALIDADE: Record<TipoToken, string> = { convite: "7 days", reset: "1 hour" };

function hashToken(cru: string): string {
  return crypto.createHash("sha256").update(cru).digest("hex");
}

// Gera o token cru (para o link) e grava so o hash. Invalida tokens pendentes
// do mesmo tipo para o usuario (um link ativo por vez).
export async function criarTokenSenha(
  escolaId: string, usuarioId: string, tipo: TipoToken,
): Promise<string> {
  const cru = crypto.randomBytes(32).toString("base64url");
  const cliente = await pool.connect();
  try {
    await cliente.query("begin");
    await cliente.query(
      `update senha_tokens set usado_em = now()
        where usuario_id = $1 and tipo = $2 and usado_em is null`,
      [usuarioId, tipo],
    );
    await cliente.query(
      `insert into senha_tokens (escola_id, usuario_id, tipo, token_hash, expira_em)
       values ($1,$2,$3,$4, now() + interval '${VALIDADE[tipo]}')`,
      [escolaId, usuarioId, tipo, hashToken(cru)],
    );
    await cliente.query("commit");
  } catch (e) {
    await cliente.query("rollback");
    throw e;
  } finally {
    cliente.release();
  }
  return cru;
}

// Valida SEM consumir (para a pagina mostrar "link invalido/expirado" ao abrir).
export async function verificarTokenSenha(cru: string): Promise<{ tipo: TipoToken } | null> {
  if (!cru) return null;
  const { rows } = await pool.query(
    `select tipo from senha_tokens
      where token_hash = $1 and usado_em is null and expira_em > now() limit 1`,
    [hashToken(cru)],
  );
  return rows[0] ? { tipo: rows[0].tipo as TipoToken } : null;
}

// Consome (uso unico): marca usado_em e devolve o usuario/escola do token.
export async function consumirTokenSenha(
  cru: string,
): Promise<{ usuarioId: string; escolaId: string } | null> {
  if (!cru) return null;
  const { rows } = await pool.query(
    `update senha_tokens set usado_em = now()
      where token_hash = $1 and usado_em is null and expira_em > now()
      returning usuario_id, escola_id`,
    [hashToken(cru)],
  );
  return rows[0] ? { usuarioId: rows[0].usuario_id, escolaId: rows[0].escola_id } : null;
}
