// Configuracoes/personalizacao por escola: logo e escala de nota.
import { pool } from "./pool";

export interface ConfigEscola { logoUrl: string | null; notaMaxima: number; notaMinimaAprovacao: number; }

const PADRAO: ConfigEscola = { logoUrl: null, notaMaxima: 10, notaMinimaAprovacao: 6 };

export async function obterConfigEscola(escolaId: string): Promise<ConfigEscola> {
  const { rows } = await pool.query(
    `select logo_url, nota_maxima, nota_minima_aprovacao from configuracoes_escola where escola_id = $1`,
    [escolaId],
  );
  if (!rows[0]) return PADRAO;
  return {
    logoUrl: rows[0].logo_url ?? null,
    notaMaxima: Number(rows[0].nota_maxima),
    notaMinimaAprovacao: Number(rows[0].nota_minima_aprovacao),
  };
}

export async function salvarConfigEscola(
  escolaId: string, logoUrl: string | null, notaMaxima: number, notaMinimaAprovacao: number,
): Promise<void> {
  await pool.query(
    `insert into configuracoes_escola (escola_id, logo_url, nota_maxima, nota_minima_aprovacao, atualizado_em)
     values ($1,$2,$3,$4, now())
     on conflict (escola_id) do update set
       logo_url = excluded.logo_url, nota_maxima = excluded.nota_maxima,
       nota_minima_aprovacao = excluded.nota_minima_aprovacao, atualizado_em = now()`,
    [escolaId, logoUrl, notaMaxima, notaMinimaAprovacao],
  );
}
