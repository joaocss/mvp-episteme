-- =====================================================================
-- Ingestao incremental (porte dos conceitos de rag-ingestao-incremental para
-- TypeScript nativo — sem infra Python). Adiciona ao Episteme:
--   1) Versionamento de material: cada upload e uma VERSAO; so uma fica
--      'vigente' por material. Publicacao atomica (a nova versao vira vigente
--      numa unica transacao) evita respostas erradas no meio de uma revisao.
--   2) Dedup por hash: hash do arquivo (idempotencia — reupload identico vira
--      'duplicada') e hash de conteudo por chunk (reuso de embeddings entre
--      versoes — so re-vetoriza o que mudou).
--   3) Delecao logica (excluido_em) + janelas de vigencia (vigencia_inicio/fim).
--   4) Maquina de estados por versao (status_versao).
--
-- ADITIVO E BACKWARD-COMPATIBLE: material_chunks legados (versao_id NULL — todo
-- o conteudo ja em producao) continuam SEMPRE ativos na busca. buscar_trechos
-- so aplica o filtro de versao a chunks que pertencem a uma versao. Nenhum
-- backfill obrigatorio; nada quebra antes ou depois da migration.
-- Convencao: identificadores em portugues, sem acento, snake_case.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Enum da maquina de estados de uma versao
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_versao') then
    create type status_versao as enum (
      'pendente',     -- criada, aguardando processamento
      'extraindo',    -- extraindo texto do binario
      'vetorizando',  -- gerando/reusando embeddings
      'vigente',      -- ativa: e a versao servida na busca
      'substituida',  -- foi vigente, cedeu lugar a uma versao mais nova
      'falhou',       -- erro no processamento
      'duplicada'     -- reupload identico (mesmo hash de arquivo): custo zero
    );
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2) Versoes de material. Uma linha por upload; uma vigente por material.
-- ---------------------------------------------------------------------
create table if not exists material_versoes (
  id              uuid primary key default gen_random_uuid(),
  escola_id       uuid not null references escolas(id) on delete cascade,
  material_id     uuid not null references materiais_fonte(id) on delete cascade,
  versao          int  not null,
  status          status_versao not null default 'pendente',
  hash_arquivo    text,               -- sha256 do binario (idempotencia)
  paginas         int,
  caracteres      int,
  chunks_total    int not null default 0,
  chunks_reusados int not null default 0, -- telemetria do reuso incremental
  erro            text,
  vigencia_inicio date,               -- null = sem inicio (vale desde ja)
  vigencia_fim    date,               -- null = sem prazo (vale indefinidamente)
  publicado_em    timestamptz,
  excluido_em     timestamptz,        -- delecao logica
  criado_em       timestamptz not null default now(),
  unique (material_id, versao)
);

create index if not exists idx_matversoes_escola   on material_versoes(escola_id);
create index if not exists idx_matversoes_material  on material_versoes(material_id);
create index if not exists idx_matversoes_hash      on material_versoes(material_id, hash_arquivo);

-- Garante NO MAXIMO uma versao 'vigente' por material (o publish atomico troca
-- a antiga para 'substituida' e a nova para 'vigente' na mesma transacao).
create unique index if not exists uniq_versao_vigente
  on material_versoes (material_id) where status = 'vigente';

-- ---------------------------------------------------------------------
-- 3) material_chunks: vinculo opcional a uma versao + hash de conteudo.
--    NULL = chunk legado (pre-versionamento): sempre ativo na busca.
-- ---------------------------------------------------------------------
alter table material_chunks
  add column if not exists versao_id uuid references material_versoes(id) on delete cascade;
alter table material_chunks
  add column if not exists hash_conteudo text;

create index if not exists idx_chunks_versao on material_chunks(versao_id);
create index if not exists idx_chunks_hash   on material_chunks(material_id, hash_conteudo);

-- ---------------------------------------------------------------------
-- 4) buscar_trechos: MESMA assinatura (6 args) da migration 20260803000100.
--    Acrescenta so o filtro de versao, backward-compatible:
--      chunk sem versao (legado)  -> sempre elegivel
--      chunk com versao           -> elegivel se a versao esta 'vigente',
--                                    nao foi excluida e esta na janela de vigencia
-- ---------------------------------------------------------------------
drop function if exists buscar_trechos(uuid, vector, int, text, text, uuid);

create or replace function buscar_trechos(
  p_escola_id  uuid,
  p_consulta   vector(768),
  p_limite     int default 5,
  p_disciplina text default null,
  p_ano        text default null,
  p_turma_id   uuid default null
)
returns table (
  chunk_id  uuid,
  texto     text,
  metadados jsonb,
  score     real
)
language sql stable as $$
  select
    c.id,
    c.texto,
    c.metadados,
    1 - (c.embedding <=> p_consulta) as score
  from material_chunks c
  join materiais_fonte m on m.id = c.material_id
  where c.escola_id = p_escola_id
    and (p_disciplina is null or m.disciplina = p_disciplina)
    and (p_ano is null or m.ano = p_ano)
    and (
      p_turma_id is null
      or exists (
        select 1 from materiais_turmas mt
        where mt.material_id = m.id and mt.turma_id = p_turma_id
      )
    )
    and (
      c.versao_id is null   -- chunk legado: sempre ativo
      or exists (
        select 1 from material_versoes v
        where v.id = c.versao_id
          and v.status = 'vigente'
          and v.excluido_em is null
          and (v.vigencia_inicio is null or v.vigencia_inicio <= current_date)
          and (v.vigencia_fim    is null or v.vigencia_fim    >= current_date)
      )
    )
  order by c.embedding <=> p_consulta
  limit p_limite;
$$;

-- ---------------------------------------------------------------------
-- RLS: leitura isolada por escola na nova tabela; escritas pelo pool
-- privilegiado do backend, sempre filtrando por escola_id.
-- ---------------------------------------------------------------------
alter table material_versoes enable row level security;

create policy iso_material_versoes on material_versoes
  for select using (escola_id = escola_atual());
