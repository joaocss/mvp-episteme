// LGPD — termo de privacidade e consentimento parental (modo SOFT: registra,
// nao bloqueia). termos_privacidade e global; consentimentos sao por escola.
// Deploy-safe: se as tabelas ainda nao existem (migration nao aplicada), as
// leituras degradam para "sem termo / sem consentimento" sem quebrar a app.
import { pool } from "./pool";

const ERROS_SCHEMA_AUSENTE = new Set(["42P01", "42703"]);

export interface Termo { versao: string; titulo: string; conteudo: string }

export async function termoVigente(): Promise<Termo | null> {
  try {
    const { rows } = await pool.query(
      `select versao, titulo, conteudo from termos_privacidade where vigente = true limit 1`,
    );
    return rows[0] ?? null;
  } catch (e: any) {
    if (ERROS_SCHEMA_AUSENTE.has(e?.code)) return null;
    throw e;
  }
}

// Conjunto de alunoIds que ja tem consentimento (nao revogado) para uma versao
// do termo, dentre os alunos informados.
export async function alunosComConsentimento(
  escolaId: string, termoVersao: string, alunoIds: string[],
): Promise<Set<string>> {
  if (alunoIds.length === 0) return new Set();
  try {
    const { rows } = await pool.query(
      `select distinct aluno_id from consentimentos
       where escola_id = $1 and termo_versao = $2 and revogado_em is null
         and aluno_id = any($3::uuid[])`,
      [escolaId, termoVersao, alunoIds],
    );
    return new Set(rows.map((r) => r.aluno_id as string));
  } catch (e: any) {
    if (ERROS_SCHEMA_AUSENTE.has(e?.code)) return new Set();
    throw e;
  }
}

// Registra (idempotente) o consentimento de um responsavel para um aluno.
export async function registrarConsentimento(
  escolaId: string, alunoId: string, responsavelEmail: string,
  responsavelId: string | null, termoVersao: string,
): Promise<void> {
  await pool.query(
    `insert into consentimentos (escola_id, aluno_id, responsavel_email, responsavel_id, termo_versao)
     values ($1,$2,$3,$4,$5)
     on conflict (aluno_id, termo_versao, responsavel_email)
       do update set revogado_em = null, concedido_em = now()`,
    [escolaId, alunoId, responsavelEmail.toLowerCase(), responsavelId, termoVersao],
  );
}
