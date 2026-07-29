-- Autenticacao por senha (piloto).
alter table usuarios add column if not exists senha_hash text;
