// Materiais-fonte da escola (livro, apostila, PDF) e seu vinculo com turmas.
// O material e a "capa" (titulo, disciplina, ano); os trechos vetorizados ficam
// em material_chunks (gravados pela ingestao). Um material pode servir varias
// turmas (materiais_turmas). Todas as escritas passam pelo pool privilegiado;
// SEMPRE filtrar por escola_id para preservar o isolamento entre escolas.
import { pool } from "./pool";

export type StatusIngestao = "pendente" | "processando" | "concluido" | "erro";
export type PapelAudiencia = "aluno" | "professor" | "gestor";
// Regra de audiencia: 'escola' (todos) ou 'papel' (aluno/professor/gestor).
export interface PublicoAudiencia { tipo: "escola" | "papel"; papel?: PapelAudiencia }

export interface MaterialLista {
  id: string;
  tipo: string;
  disciplina: string;
  ano: string;
  titulo: string;
  referencia: string | null;
  statusIngestao: StatusIngestao;
  trechos: number;
  versao: number | null; // numero da versao vigente (null = material legado sem versao)
  turmas: { id: string; nome: string }[];
  publicos: PublicoAudiencia[]; // audiencias por papel/escola (alem das turmas)
  criadoEm: string;
}

// Postgres: relacao ausente / coluna ausente (migration de versionamento nao aplicada).
const ERROS_SCHEMA_AUSENTE = new Set(["42P01", "42703"]);

export async function criarMaterial(
  escolaId: string,
  dados: { tipo: string; disciplina: string; ano: string; titulo: string; referencia?: string | null },
): Promise<string> {
  const { rows } = await pool.query(
    `insert into materiais_fonte (escola_id, tipo, disciplina, ano, titulo, referencia, status_ingestao)
     values ($1,$2,$3,$4,$5,$6,'pendente') returning id`,
    [escolaId, dados.tipo, dados.disciplina, dados.ano, dados.titulo, dados.referencia ?? null],
  );
  return rows[0].id;
}

// Confere se um material pertence a escola (isolamento antes de revisar/versionar).
export async function materialPertenceAEscola(escolaId: string, materialId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `select 1 from materiais_fonte where id = $2 and escola_id = $1 limit 1`,
    [escolaId, materialId],
  );
  return rows.length > 0;
}

export async function atualizarStatusIngestao(
  escolaId: string, materialId: string, status: StatusIngestao,
): Promise<void> {
  await pool.query(
    `update materiais_fonte set status_ingestao = $3 where id = $2 and escola_id = $1`,
    [escolaId, materialId, status],
  );
}

export async function excluirMaterial(escolaId: string, materialId: string): Promise<void> {
  // material_chunks e materiais_turmas caem por cascade (FK on delete cascade).
  await pool.query(`delete from materiais_fonte where id = $2 and escola_id = $1`, [escolaId, materialId]);
}

export async function vincularMaterialTurma(
  escolaId: string, materialId: string, turmaId: string,
): Promise<void> {
  await pool.query(
    `insert into materiais_turmas (escola_id, material_id, turma_id) values ($1,$2,$3)
     on conflict (material_id, turma_id) do nothing`,
    [escolaId, materialId, turmaId],
  );
}

export async function desvincularMaterialTurma(
  escolaId: string, materialId: string, turmaId: string,
): Promise<void> {
  await pool.query(
    `delete from materiais_turmas where escola_id = $1 and material_id = $2 and turma_id = $3`,
    [escolaId, materialId, turmaId],
  );
}

// Substitui o conjunto de turmas de um material (usado na tela de gestao).
export async function definirTurmasDoMaterial(
  escolaId: string, materialId: string, turmaIds: string[],
): Promise<void> {
  const cliente = await pool.connect();
  try {
    await cliente.query("begin");
    await cliente.query(
      `delete from materiais_turmas where escola_id = $1 and material_id = $2`,
      [escolaId, materialId],
    );
    for (const turmaId of turmaIds) {
      await cliente.query(
        `insert into materiais_turmas (escola_id, material_id, turma_id) values ($1,$2,$3)
         on conflict (material_id, turma_id) do nothing`,
        [escolaId, materialId, turmaId],
      );
    }
    await cliente.query("commit");
  } catch (e) {
    await cliente.query("rollback");
    throw e;
  } finally {
    cliente.release();
  }
}

// Query version-aware: conta so os trechos ATIVOS (chunks legados sem versao +
// chunks da versao vigente) e traz o numero da versao vigente. Versoes
// substituidas nao inflam a contagem.
const SQL_MATERIAIS_VERSIONADO = `
  select
    m.id, m.tipo, m.disciplina, m.ano, m.titulo, m.referencia, m.status_ingestao, m.criado_em,
    vv.versao as versao_atual,
    coalesce(ch.n, 0) as trechos,
    coalesce(
      json_agg(json_build_object('id', t.id, 'nome', t.nome))
        filter (where t.id is not null), '[]'
    ) as turmas
  from materiais_fonte m
  left join material_versoes vv
    on vv.material_id = m.id and vv.status = 'vigente' and vv.excluido_em is null
  left join (
    select c.material_id, count(*) as n
    from material_chunks c
    left join material_versoes v on v.id = c.versao_id
    where c.versao_id is null or (v.status = 'vigente' and v.excluido_em is null)
    group by c.material_id
  ) ch on ch.material_id = m.id
  left join materiais_turmas mt on mt.material_id = m.id
  left join turmas t on t.id = mt.turma_id
  where m.escola_id = $1
  group by m.id, vv.versao, ch.n
  order by m.criado_em desc`;

// Query legada (pre-versionamento): conta todos os chunks do material. Usada
// como fallback quando a migration de versionamento ainda nao foi aplicada.
const SQL_MATERIAIS_LEGADO = `
  select
    m.id, m.tipo, m.disciplina, m.ano, m.titulo, m.referencia, m.status_ingestao, m.criado_em,
    null::int as versao_atual,
    coalesce(ch.n, 0) as trechos,
    coalesce(
      json_agg(json_build_object('id', t.id, 'nome', t.nome))
        filter (where t.id is not null), '[]'
    ) as turmas
  from materiais_fonte m
  left join (
    select material_id, count(*) as n from material_chunks group by material_id
  ) ch on ch.material_id = m.id
  left join materiais_turmas mt on mt.material_id = m.id
  left join turmas t on t.id = mt.turma_id
  where m.escola_id = $1
  group by m.id, ch.n
  order by m.criado_em desc`;

// Substitui o conjunto de audiencias por papel/escola de um material.
export async function definirPublicoDoMaterial(
  escolaId: string, materialId: string, regras: PublicoAudiencia[],
): Promise<void> {
  const cliente = await pool.connect();
  try {
    await cliente.query("begin");
    await cliente.query(
      `delete from materiais_publico where escola_id = $1 and material_id = $2`,
      [escolaId, materialId],
    );
    for (const r of regras) {
      const papel = r.tipo === "papel" ? (r.papel ?? null) : null;
      if (r.tipo === "papel" && !papel) continue; // regra invalida
      await cliente.query(
        `insert into materiais_publico (escola_id, material_id, tipo, papel) values ($1,$2,$3,$4)
         on conflict (material_id, tipo, papel) do nothing`,
        [escolaId, materialId, r.tipo, papel],
      );
    }
    await cliente.query("commit");
  } catch (e) {
    await cliente.query("rollback");
    throw e;
  } finally {
    cliente.release();
  }
}

// Mapa material_id -> audiencias. Deploy-safe: tabela ausente = mapa vazio.
async function publicosPorMaterial(escolaId: string): Promise<Map<string, PublicoAudiencia[]>> {
  const mapa = new Map<string, PublicoAudiencia[]>();
  try {
    const { rows } = await pool.query(
      `select material_id, tipo, papel from materiais_publico where escola_id = $1`,
      [escolaId],
    );
    for (const r of rows) {
      const lista = mapa.get(r.material_id) ?? [];
      lista.push({ tipo: r.tipo, papel: r.papel ?? undefined });
      mapa.set(r.material_id, lista);
    }
  } catch (e: any) {
    if (!ERROS_SCHEMA_AUSENTE.has(e?.code)) throw e;
  }
  return mapa;
}

export async function listarMateriais(escolaId: string): Promise<MaterialLista[]> {
  let rows: any[];
  try {
    ({ rows } = await pool.query(SQL_MATERIAIS_VERSIONADO, [escolaId]));
  } catch (e: any) {
    // Migration de versionamento ainda nao aplicada: cai para a query legada.
    if (!ERROS_SCHEMA_AUSENTE.has(e?.code)) throw e;
    ({ rows } = await pool.query(SQL_MATERIAIS_LEGADO, [escolaId]));
  }
  const mapaPublicos = await publicosPorMaterial(escolaId);
  return rows.map((r) => {
    const trechos = Number(r.trechos) || 0;
    // Materiais ingeridos via CLI antigo nunca setaram status_ingestao; se ja ha
    // trechos gravados, o material esta de fato concluido (evita "Pendente" falso).
    const status = (r.status_ingestao === "pendente" && trechos > 0)
      ? "concluido" : (r.status_ingestao as StatusIngestao);
    return {
      id: r.id,
      tipo: r.tipo,
      disciplina: r.disciplina,
      ano: r.ano,
      titulo: r.titulo,
      referencia: r.referencia ?? null,
      statusIngestao: status,
      trechos,
      versao: r.versao_atual != null ? Number(r.versao_atual) : null,
      turmas: (typeof r.turmas === "string" ? JSON.parse(r.turmas) : r.turmas) as { id: string; nome: string }[],
      publicos: mapaPublicos.get(r.id) ?? [],
      criadoEm: new Date(r.criado_em).toISOString(),
    };
  });
}
