-- Dados de demonstracao para desenvolvimento local (supabase db reset roda isto).
insert into escolas (id, nome, status) values
  ('00000000-0000-0000-0000-000000000001', 'Escola Demonstracao', 'ativa')
  on conflict (id) do nothing;

insert into materiais_fonte (id, escola_id, tipo, disciplina, ano, titulo, status_ingestao) values
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'livro', 'matematica', '6o ano', 'Superacao Matematica 6 ano', 'pendente')
  on conflict (id) do nothing;
