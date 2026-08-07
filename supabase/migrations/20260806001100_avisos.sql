-- =====================================================================
-- Avisos/comunicados (Frente 5). O gestor publica um aviso e escolhe a
-- AUDIENCIA (papeis: alunos, professores, gestao — ou todos), opcionalmente
-- restrito a uma turma. Quem for da audiencia recebe no app (push) + e-mail e
-- ve o aviso na sua lista. Isolamento por escola_id.
-- Convencao: identificadores em portugues, sem acento, snake_case.
-- =====================================================================

create table if not exists avisos (
  id         uuid primary key default gen_random_uuid(),
  escola_id  uuid not null references escolas(id) on delete cascade,
  autor_id   uuid references usuarios(id) on delete set null,
  titulo     text not null,
  corpo      text not null,
  audiencia  text[] not null default '{}',   -- subconjunto de {aluno,professor,gestor}
  turma_id   uuid references turmas(id) on delete cascade,  -- null = toda a escola (na audiencia)
  criado_em  timestamptz not null default now()
);

create index if not exists idx_avisos_escola on avisos(escola_id, criado_em desc);

alter table avisos enable row level security;
create policy iso_avisos on avisos for select using (escola_id = escola_atual());
