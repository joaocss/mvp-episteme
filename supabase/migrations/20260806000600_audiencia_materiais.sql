-- =====================================================================
-- RAG por AUDIENCIA: quem a IA atende com base em cada documento. Ate aqui os
-- materiais so tinham escopo por TURMA (materiais_turmas) e so o ALUNO usava a
-- IA. Agora o professor/diretor escolhe a audiencia de cada documento:
--   - turma X            -> materiais_turmas (JA EXISTE, inalterado)
--   - papel 'professor'  -> visivel a IA dos professores
--   - papel 'gestor'     -> visivel a IA da gestao/coordenacao
--   - escola toda        -> visivel a todos (ex.: regimento)
--
-- ADITIVO: o caminho por turma/disciplina/ano continua igual; so acrescentamos
-- audiencias por papel/escola numa tabela nova (materiais_publico) e um novo
-- ramo na busca. Documentos legados (sem regra) seguem no comportamento antigo.
-- A audiencia por papel/escola IGNORA disciplina/ano (um regimento nao e materia).
-- Convencao: identificadores em portugues, sem acento, snake_case.
-- =====================================================================

create table if not exists materiais_publico (
  id          uuid primary key default gen_random_uuid(),
  escola_id   uuid not null references escolas(id) on delete cascade,
  material_id uuid not null references materiais_fonte(id) on delete cascade,
  tipo        text not null check (tipo in ('escola','papel')),
  papel       text check (papel in ('aluno','professor','gestor')),
  criado_em   timestamptz not null default now(),
  -- coerencia: papel preenchido sse e so se tipo='papel'
  check ((tipo = 'papel') = (papel is not null)),
  unique (material_id, tipo, papel)
);

create index if not exists idx_matpublico_escola   on materiais_publico(escola_id);
create index if not exists idx_matpublico_material  on materiais_publico(material_id);

-- ---------------------------------------------------------------------
-- Nova buscar_trechos: acrescenta o papel de quem pergunta (p_papel) e um
-- flag p_incluir_conteudo. Preserva o ramo de CONTEUDO (disciplina/ano/turma,
-- comportamento atual) e adiciona o ramo de AUDIENCIA (papel/escola).
--   - Aluno tutor:        p_incluir_conteudo=true,  p_papel='aluno'  -> conteudo da turma/legado + docs de escola/aluno.
--   - Assistente professor: p_incluir_conteudo=false, p_papel='professor' -> SO docs de audiencia professor/escola.
-- Mantem o filtro de VERSAO VIGENTE (Fase 10). Assinatura antiga (6 args) some;
-- os novos args tem default, entao chamadas com 6 args seguem valendo.
-- ---------------------------------------------------------------------
drop function if exists buscar_trechos(uuid, vector, int, text, text, uuid);

create or replace function buscar_trechos(
  p_escola_id        uuid,
  p_consulta         vector(768),
  p_limite           int default 5,
  p_disciplina       text default null,
  p_ano              text default null,
  p_turma_id         uuid default null,
  p_papel            text default null,
  p_incluir_conteudo boolean default true
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
    -- versao ativa (Fase 10): legado (sem versao) ou versao vigente na janela
    and (
      c.versao_id is null
      or exists (
        select 1 from material_versoes v
        where v.id = c.versao_id
          and v.status = 'vigente'
          and v.excluido_em is null
          and (v.vigencia_inicio is null or v.vigencia_inicio <= current_date)
          and (v.vigencia_fim    is null or v.vigencia_fim    >= current_date)
      )
    )
    and (
      -- ramo CONTEUDO (disciplina/ano/turma) — comportamento atual
      (
        p_incluir_conteudo
        and (p_disciplina is null or m.disciplina = p_disciplina)
        and (p_ano is null or m.ano = p_ano)
        and (
          p_turma_id is null
          or exists (
            select 1 from materiais_turmas mt
            where mt.material_id = m.id and mt.turma_id = p_turma_id
              and mt.escola_id = p_escola_id
          )
        )
      )
      -- ramo AUDIENCIA (papel/escola) — ignora disciplina/ano
      or exists (
        select 1 from materiais_publico mp
        where mp.material_id = m.id
          and mp.escola_id = p_escola_id
          and (mp.tipo = 'escola' or (mp.tipo = 'papel' and mp.papel = p_papel))
      )
    )
  order by c.embedding <=> p_consulta
  limit p_limite;
$$;

-- RLS: leitura isolada por escola; escritas pelo pool privilegiado.
alter table materiais_publico enable row level security;
create policy iso_materiais_publico on materiais_publico
  for select using (escola_id = escola_atual());
