// Onboarding self-service: cria uma NOVA escola (tenant) + o primeiro gestor,
// numa transacao. O gestor nasce SEM senha (senha_hash null) e define a senha
// pelo link de convite (reusa senha_tokens/definir-senha da Fase 2). Multi-tenant
// por escola_id: adicionar escola e inserir linhas, nao subir infra nova.
import { pool } from "./pool";

export interface NovaEscola {
  escolaId: string;
  gestorId: string;
}

// Email e unico por conta de acesso (uma pessoa = um login). Evita criar uma
// escola cujo gestor colidiria com uma conta existente.
export async function emailJaUsado(email: string): Promise<boolean> {
  const { rows } = await pool.query(
    `select 1 from usuarios where lower(email) = lower($1) limit 1`,
    [email],
  );
  return rows.length > 0;
}

export async function criarEscolaComGestor(
  nomeEscola: string,
  nomeGestor: string,
  email: string,
): Promise<NovaEscola> {
  const cliente = await pool.connect();
  try {
    await cliente.query("begin");
    const esc = await cliente.query(
      `insert into escolas (nome, status) values ($1, 'ativa') returning id`,
      [nomeEscola],
    );
    const escolaId = esc.rows[0].id;
    // Config padrao (nota 0-10, aprovacao 6) ja pronta para a escola nova.
    await cliente.query(
      `insert into configuracoes_escola (escola_id) values ($1) on conflict (escola_id) do nothing`,
      [escolaId],
    );
    const g = await cliente.query(
      `insert into usuarios (escola_id, papel, nome, email, senha_hash)
       values ($1, 'gestor', $2, $3, null) returning id`,
      [escolaId, nomeGestor, email],
    );
    await cliente.query("commit");
    return { escolaId, gestorId: g.rows[0].id };
  } catch (e) {
    await cliente.query("rollback");
    throw e;
  } finally {
    cliente.release();
  }
}
