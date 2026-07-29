// Persistencia das conversas do tutor (Postgres direto): sessoes, interacoes,
// fontes usadas, eventos de guardrail e auditoria. Base da Fase 2.
import pg from "pg";
import { TrechoRecuperado } from "../ia/tipos";
import { EventoGuardrail } from "../ia/guardrails";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function criarSessao(escolaId: string, alunoId: string): Promise<string> {
  const { rows } = await pool.query(
    `insert into sessoes_tutor (escola_id, aluno_id) values ($1, $2) returning id`,
    [escolaId, alunoId],
  );
  return rows[0].id;
}

export interface DadosInteracao {
  escolaId: string;
  sessaoId: string;
  autor: "aluno" | "ia";
  conteudo: string;
  modelo?: string | null;
  tokensEntrada?: number | null;
  tokensSaida?: number | null;
  latenciaMs?: number | null;
  traceId: string;
}

export async function registrarInteracao(d: DadosInteracao): Promise<string> {
  const { rows } = await pool.query(
    `insert into interacoes
       (escola_id, sessao_id, autor, conteudo, modelo, tokens_entrada, tokens_saida, latencia_ms, trace_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
    [d.escolaId, d.sessaoId, d.autor, d.conteudo, d.modelo ?? null,
     d.tokensEntrada ?? null, d.tokensSaida ?? null, d.latenciaMs ?? null, d.traceId],
  );
  return rows[0].id;
}

export async function registrarFontes(
  escolaId: string, interacaoId: string, fontes: TrechoRecuperado[],
): Promise<void> {
  for (const f of fontes) {
    await pool.query(
      `insert into interacao_fontes (escola_id, interacao_id, chunk_id, score)
       values ($1,$2,$3,$4)`,
      [escolaId, interacaoId, f.chunkId, f.score],
    );
  }
}

export async function registrarGuardrails(
  escolaId: string, interacaoId: string | null, eventos: EventoGuardrail[], traceId: string,
): Promise<void> {
  for (const e of eventos) {
    await pool.query(
      `insert into guardrail_eventos
         (escola_id, interacao_id, categoria, acao, severidade, detalhe, trace_id)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [escolaId, interacaoId, e.categoria, e.acao, "media", e.detalhe, traceId],
    );
  }
}

export async function registrarAuditoria(
  escolaId: string, atorId: string, acao: string,
  entidade: string, entidadeId: string | null, traceId: string,
): Promise<void> {
  await pool.query(
    `insert into auditoria (escola_id, ator_id, acao, entidade, entidade_id, trace_id)
     values ($1,$2,$3,$4,$5,$6)`,
    [escolaId, atorId, acao, entidade, entidadeId, traceId],
  );
}
