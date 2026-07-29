-- Dados de demonstracao para desenvolvimento local (supabase db reset roda isto).
insert into escolas (id, nome, status) values
  ('00000000-0000-0000-0000-000000000001', 'Escola Demonstracao', 'ativa')
  on conflict (id) do nothing;

insert into materiais_fonte (id, escola_id, tipo, disciplina, ano, titulo, status_ingestao) values
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'livro', 'matematica', '6o ano', 'Superacao Matematica 6 ano', 'pendente')
  on conflict (id) do nothing;

-- Pre-cadastro de teste: uma turma de 6o ano e o Joao como aluno.
insert into turmas (id, escola_id, nome, ano_letivo, serie) values
  ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001','6o A',2026,'6o ano')
  on conflict (id) do nothing;

insert into usuarios (id, escola_id, papel, nome, email) values
  ('00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000001','aluno','Joao (teste)','joaosena.cosme@gmail.com')
  on conflict (id) do nothing;

insert into matriculas (id, escola_id, aluno_id, turma_id) values
  ('00000000-0000-0000-0000-000000000040','00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000020')
  on conflict (id) do nothing;

-- Professor de teste (entra pelo mesmo login por email).
insert into usuarios (id, escola_id, papel, nome, email) values
  ('00000000-0000-0000-0000-000000000050','00000000-0000-0000-0000-000000000001',
   'professor','Professora (teste)','professor@episteme.teste')
  on conflict (id) do nothing;

insert into professores_turmas (id, escola_id, professor_id, turma_id, disciplina) values
  ('00000000-0000-0000-0000-000000000060','00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000050','00000000-0000-0000-0000-000000000020','matematica')
  on conflict (id) do nothing;
