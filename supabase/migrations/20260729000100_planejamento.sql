-- Perfil do aluno (inclusao) + modulo de planejamento inteligente.
alter table usuarios add column if not exists atipicidades jsonb not null default '[]'::jsonb;
alter table usuarios add column if not exists adaptacoes   jsonb not null default '[]'::jsonb;

create table if not exists planos_ensino (
  id           uuid primary key default gen_random_uuid(),
  escola_id    uuid not null references escolas(id) on delete cascade,
  professor_id uuid not null references usuarios(id) on delete cascade,
  disciplina   text not null,
  turma        text not null,
  ano_letivo   int  not null,
  conteudo     jsonb not null,
  versao       int  not null default 1,
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now()
);

create table if not exists planos_aula (
  id              uuid primary key default gen_random_uuid(),
  escola_id       uuid not null references escolas(id) on delete cascade,
  plano_ensino_id uuid references planos_ensino(id) on delete set null,
  topico          text not null,
  data_aula       date,
  duracao_min     int,
  conteudo        jsonb not null,
  template        boolean not null default false,
  pai_id          uuid references planos_aula(id) on delete set null,
  criado_em       timestamptz not null default now()
);

create table if not exists adaptacoes_aula (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  plano_aula_id uuid references planos_aula(id) on delete cascade,
  aluno_id      uuid references usuarios(id) on delete set null,
  tipo          text,
  descricao     text,
  estrategias   jsonb,
  criado_em     timestamptz not null default now()
);

create index if not exists idx_planoens_escola on planos_ensino(escola_id);
create index if not exists idx_planoens_prof   on planos_ensino(professor_id);
create index if not exists idx_planoaula_escola on planos_aula(escola_id);

alter table planos_ensino  enable row level security;
alter table planos_aula    enable row level security;
alter table adaptacoes_aula enable row level security;
create policy iso_planoens  on planos_ensino  for select using (escola_id = escola_atual());
create policy iso_planoaula on planos_aula    for select using (escola_id = escola_atual());
create policy iso_adaptaula on adaptacoes_aula for select using (escola_id = escola_atual());
