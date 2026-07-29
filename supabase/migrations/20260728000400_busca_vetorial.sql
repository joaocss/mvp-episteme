-- =====================================================================
-- Migracao 003: funcao de busca por similaridade (RAG)
-- Recebe o vetor da pergunta e devolve os trechos mais proximos
-- DA MESMA ESCOLA. O filtro por escola_id e obrigatorio.
-- =====================================================================
create or replace function buscar_trechos(
  p_escola_id uuid,
  p_consulta  vector(768),
  p_limite    int default 5
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
    1 - (c.embedding <=> p_consulta) as score  -- distancia cosseno -> similaridade
  from material_chunks c
  where c.escola_id = p_escola_id
  order by c.embedding <=> p_consulta
  limit p_limite;
$$;
