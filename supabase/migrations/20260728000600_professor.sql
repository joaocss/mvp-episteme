-- Tabelas de apoio ao painel do professor.
create table if not exists professores_turmas (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  professor_id  uuid not null references usuarios(id) on delete cascade,
  turma_id      uuid not null references turmas(id) on delete cascade,
  disciplina    text not null default 'matematica',
  criado_em     timestamptz not null default now(),
  unique (professor_id, turma_id, disciplina)
);

create table if not exists acessos_professor (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  professor_id  uuid not null references usuarios(id) on delete cascade,
  aluno_id      uuid references usuarios(id) on delete set null,
  recurso       text not null,
  criado_em     timestamptz not null default now()
);

create index if not exists idx_profturmas_escola on professores_turmas(escola_id);
create index if not exists idx_profturmas_prof   on professores_turmas(professor_id);
create index if not exists idx_acessosprof_escola on acessos_professor(escola_id);

alter table professores_turmas enable row level security;
alter table acessos_professor  enable row level security;

create policy iso_profturmas on professores_turmas
  for select using (escola_id = escola_atual());
create policy iso_acessosprof on acessos_professor
  for select using (escola_id = escola_atual());
