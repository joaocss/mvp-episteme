-- Fase 7 (multi-serie/multi-disciplina): antes so existia Matematica do 6o
-- ano, entao a busca no livro e na BNCC nunca precisou filtrar por
-- disciplina/serie. Agora que a escola tem material de mais disciplinas e
-- series, as duas funcoes de busca passam a aceitar filtro opcional (null =
-- sem filtro, mantem compatibilidade com quem ja chama sem esses parametros).
create or replace function buscar_trechos(
  p_escola_id  uuid,
  p_consulta   vector(768),
  p_limite     int default 5,
  p_disciplina text default null,
  p_ano        text default null
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
  order by c.embedding <=> p_consulta
  limit p_limite;
$$;

create or replace function buscar_bncc(
  p_consulta   vector(768),
  p_disciplina text default null,
  p_ano        text default null
)
returns text
language sql stable as $$
  select codigo
  from competencias_bncc
  where embedding is not null
    and (p_disciplina is null or disciplina = p_disciplina)
    and (p_ano is null or ano = p_ano)
  order by embedding <=> p_consulta
  limit 1;
$$;

create or replace function buscar_bncc_similar(
  p_consulta   vector(768),
  p_limite     int default 3,
  p_disciplina text default null,
  p_ano        text default null
)
returns table (codigo text, descricao text, unidade_tematica text, score real)
language sql stable as $$
  select codigo, descricao, unidade_tematica, 1 - (embedding <=> p_consulta) as score
  from competencias_bncc
  where embedding is not null
    and (p_disciplina is null or disciplina = p_disciplina)
    and (p_ano is null or ano = p_ano)
  order by embedding <=> p_consulta
  limit p_limite;
$$;
