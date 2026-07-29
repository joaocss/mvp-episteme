-- Fase 2 (Gestor): campos extras para o CRUD de usuarios.
-- data_nascimento: usado no cadastro do aluno.
-- disciplinas: usado no cadastro do professor (texto livre, ex.: "Matematica, Fisica").
alter table usuarios add column if not exists data_nascimento date;
alter table usuarios add column if not exists disciplinas text;
