-- Fase 6 (tutor): busca por similaridade na BNCC com score, para usar como
-- segunda camada de grounding quando o livro nao tem o trecho (buscar_bncc
-- ja existente so devolve o codigo mais proximo, sem score nem descricao).
create or replace function buscar_bncc_similar(p_consulta vector(768), p_limite int default 3)
returns table (codigo text, descricao text, unidade_tematica text, score real)
language sql stable as $$
  select codigo, descricao, unidade_tematica, 1 - (embedding <=> p_consulta) as score
  from competencias_bncc
  where embedding is not null
  order by embedding <=> p_consulta
  limit p_limite;
$$;
