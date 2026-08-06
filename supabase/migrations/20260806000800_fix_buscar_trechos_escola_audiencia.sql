-- =====================================================================
-- Correcao de seguranca (isolamento multi-tenant) na buscar_trechos: o ramo de
-- AUDIENCIA (materiais_publico) e a subquery de turma (materiais_turmas) nao
-- filtravam por escola_id. Como material_chunks/materiais_fonte ja prendem a
-- escola, o risco pratico exigia uma regra de audiencia gravada com material_id
-- de OUTRA escola (fechado tambem no PATCH de /api/materiais, que agora valida
-- posse). Ainda assim, defesa em profundidade: a busca so considera regras da
-- propria escola. Re-aplica a funcao (a migration 20260806000600 ja rodou nos
-- bancos existentes; o arquivo original tambem foi corrigido para instalacoes
-- novas — create or replace torna a dupla aplicacao idempotente).
-- =====================================================================

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
