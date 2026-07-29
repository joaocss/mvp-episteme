-- Etiquetagem BNCC: embedding das habilidades e classificacao da pergunta.
alter table competencias_bncc add column if not exists embedding vector(768);
alter table interacoes add column if not exists competencia_bncc text;

-- Retorna o codigo da habilidade BNCC mais proxima do vetor da pergunta.
create or replace function buscar_bncc(p_consulta vector(768))
returns text
language sql stable as $$
  select codigo
  from competencias_bncc
  where embedding is not null
  order by embedding <=> p_consulta
  limit 1;
$$;
