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

-- Gestor de teste (diretor/coordenador).
insert into usuarios (id, escola_id, papel, nome, email) values
  ('00000000-0000-0000-0000-000000000070','00000000-0000-0000-0000-000000000001',
   'gestor','Gestor (teste)','gestor@episteme.teste')
  on conflict (id) do nothing;

-- Senha padrao 'episteme123' para todos os usuarios de teste.
update usuarios set senha_hash = 'b1769fae28105b08dff82d572e1f8cfb:649aed0ea8616585f5e139e86345a28e3f36f67aaa48fa63d98532034dfa4403'
 where email in ('joaosena.cosme@gmail.com','professor@episteme.teste','gestor@episteme.teste');

-- Alunos de teste com atipicidades (para o modulo de planejamento).
insert into usuarios (id, escola_id, papel, nome, email, atipicidades, adaptacoes) values
  ('00000000-0000-0000-0000-000000000080','00000000-0000-0000-0000-000000000001','aluno','Ana (teste)','ana@episteme.teste',
   '["TDAH","Dislexia"]','["Mais tempo para atividades","Material visual"]'),
  ('00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000001','aluno','Maria (teste)','maria@episteme.teste',
   '["Autismo Nível 1"]','["Rotina estruturada","Evitar mudanças bruscas"]')
  on conflict (id) do nothing;

insert into matriculas (id, escola_id, aluno_id, turma_id) values
  ('00000000-0000-0000-0000-000000000090','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000080','00000000-0000-0000-0000-000000000020'),
  ('00000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000020')
  on conflict (id) do nothing;
