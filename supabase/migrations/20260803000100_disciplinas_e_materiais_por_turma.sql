-- =====================================================================
-- Conteudo escopado por turma (pedido do diretor/professor):
--   1) Catalogo de disciplinas por escola (o gestor "cria disciplinas").
--   2) Vinculo material <-> turma (M:N): um PDF/livro pode servir varias
--      turmas; cada turma tem seus materiais. O tutor passa a restringir a
--      busca aos materiais da turma do aluno.
--   3) Modo estrito por turma: quando ligado, o tutor so responde com base
--      nos materiais da turma (bloqueia o fallback BNCC / conhecimento geral).
--   4) buscar_trechos ganha filtro opcional por turma (null = comportamento
--      atual, para nao quebrar quem ja chama por disciplina/ano).
-- Convencao: identificadores em portugues, sem acento, snake_case.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Catalogo de disciplinas por escola
-- ---------------------------------------------------------------------
create table if not exists disciplinas (
  id          uuid primary key default gen_random_uuid(),
  escola_id   uuid not null references escolas(id) on delete cascade,
  nome        text not null,            -- rotulo amigavel: "Matematica"
  slug        text not null,            -- valor sem acento gravado nos materiais: "matematica"
  criado_em   timestamptz not null default now(),
  unique (escola_id, slug)
);

create index if not exists idx_disciplinas_escola on disciplinas(escola_id);

-- Semeia o catalogo com as disciplinas que ja existem em uso (materiais,
-- provas e vinculos de professor), para o painel do gestor nao nascer vazio.
insert into disciplinas (escola_id, nome, slug)
select distinct d.escola_id, d.slug, d.slug
from (
  select escola_id, disciplina as slug from materiais_fonte
  union
  select escola_id, disciplina as slug from provas
  union
  select escola_id, disciplina as slug from professores_turmas
) d
where d.slug is not null and d.slug <> ''
on conflict (escola_id, slug) do nothing;

-- ---------------------------------------------------------------------
-- 2) Vinculo material <-> turma (M:N)
-- ---------------------------------------------------------------------
create table if not exists materiais_turmas (
  id          uuid primary key default gen_random_uuid(),
  escola_id   uuid not null references escolas(id) on delete cascade,
  material_id uuid not null references materiais_fonte(id) on delete cascade,
  turma_id    uuid not null references turmas(id) on delete cascade,
  criado_em   timestamptz not null default now(),
  unique (material_id, turma_id)
);

create index if not exists idx_matturmas_escola   on materiais_turmas(escola_id);
create index if not exists idx_matturmas_material on materiais_turmas(material_id);
create index if not exists idx_matturmas_turma    on materiais_turmas(turma_id);

-- ---------------------------------------------------------------------
-- 3) Modo estrito por turma
-- ---------------------------------------------------------------------
alter table turmas
  add column if not exists modo_estrito boolean not null default false;

-- ---------------------------------------------------------------------
-- 4) Busca vetorial com filtro opcional por turma
-- A migracao anterior (20260730000800) definiu buscar_trechos com 5 args.
-- Trocamos por uma versao com p_turma_id: quando informado, so retorna
-- trechos de materiais vinculados aquela turma (materiais_turmas).
-- ---------------------------------------------------------------------
drop function if exists buscar_trechos(uuid, vector, int, text, text);

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
  order by c.embedding <=> p_consulta
  limit p_limite;
$$;

-- ---------------------------------------------------------------------
-- RLS: isolamento por escola nas novas tabelas (leitura). Escritas passam
-- pelo pool privilegiado do backend, sempre filtrando por escola_id.
-- ---------------------------------------------------------------------
alter table disciplinas      enable row level security;
alter table materiais_turmas enable row level security;

create policy iso_disciplinas on disciplinas
  for select using (escola_id = escola_atual());
create policy iso_matturmas on materiais_turmas
  for select using (escola_id = escola_atual());
