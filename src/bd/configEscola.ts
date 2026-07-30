// Configuracoes/personalizacao por escola: nome, logo e escala de nota.
// Cada linha e por escola_id (chave primaria de configuracoes_escola), entao
// isso ja funciona para varias escolas — nao e uma URL fixa do sistema todo,
// so aparenta hoje porque so existe uma escola em uso.
import { pool } from "./pool";

export interface ConfigEscola { nome: string; logoUrl: string | null; notaMaxima: number; notaMinimaAprovacao: number; }

export async function obterConfigEscola(escolaId: string): Promise<ConfigEscola> {
  const { rows } = await pool.query(
    `select e.nome, c.logo_url, c.nota_maxima, c.nota_minima_aprovacao
     from escolas e left join configuracoes_escola c on c.escola_id = e.id
     where e.id = $1`,
    [escolaId],
  );
  const r = rows[0];
  return {
    nome: r?.nome ?? "",
    logoUrl: r?.logo_url ?? null,
    notaMaxima: r?.nota_maxima !== null && r?.nota_maxima !== undefined ? Number(r.nota_maxima) : 10,
    notaMinimaAprovacao: r?.nota_minima_aprovacao !== null && r?.nota_minima_aprovacao !== undefined ? Number(r.nota_minima_aprovacao) : 6,
  };
}

export async function renomearEscola(escolaId: string, nome: string): Promise<void> {
  await pool.query(`update escolas set nome = $2 where id = $1`, [escolaId, nome]);
}

export async function salvarConfigEscola(
  escolaId: string, logoUrl: string | null, notaMaxima: number, notaMinimaAprovacao: number, nome?: string,
): Promise<void> {
  if (nome && nome.trim()) await renomearEscola(escolaId, nome.trim());
  await pool.query(
    `insert into configuracoes_escola (escola_id, logo_url, nota_maxima, nota_minima_aprovacao, atualizado_em)
     values ($1,$2,$3,$4, now())
     on conflict (escola_id) do update set
       logo_url = excluded.logo_url, nota_maxima = excluded.nota_maxima,
       nota_minima_aprovacao = excluded.nota_minima_aprovacao, atualizado_em = now()`,
    [escolaId, logoUrl, notaMaxima, notaMinimaAprovacao],
  );
}
