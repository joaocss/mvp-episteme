-- Notas e faltas (Fase 5): lancamento manual pelo professor/gestor,
-- independente do modulo de Provas (que ja gera nota automatica em respostas).
create table if not exists notas (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  aluno_id      uuid not null references usuarios(id) on delete cascade,
  turma_id      uuid not null references turmas(id) on delete cascade,
  professor_id  uuid not null references usuarios(id) on delete cascade,
  prova_id      uuid references provas(id) on delete set null, -- null = nota avulsa
  disciplina    text not null default 'matematica',
  descricao     text not null,       -- ex.: 'Prova bimestral', 'Trabalho em grupo'
  valor         numeric(5,2) not null,
  nota_maxima   numeric(5,2) not null default 10, -- escala vigente na escola no momento do lancamento
  data_lancamento date not null default current_date,
  criado_em     timestamptz not null default now()
);

do $$ begin
  create type situacao_falta as enum ('justificada', 'nao_justificada');
exception when duplicate_object then null; end $$;

create table if not exists faltas (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  aluno_id      uuid not null references usuarios(id) on delete cascade,
  turma_id      uuid not null references turmas(id) on delete cascade,
  professor_id  uuid not null references usuarios(id) on delete cascade,
  data_falta    date not null default current_date,
  situacao      situacao_falta not null default 'nao_justificada',
  motivo        text,
  criado_em     timestamptz not null default now()
);

create index if not exists idx_notas_escola   on notas(escola_id);
create index if not exists idx_notas_aluno    on notas(aluno_id);
create index if not exists idx_notas_turma    on notas(turma_id);
create index if not exists idx_faltas_escola  on faltas(escola_id);
create index if not exists idx_faltas_aluno   on faltas(aluno_id);
create index if not exists idx_faltas_turma   on faltas(turma_id);

alter table notas  enable row level security;
alter table faltas enable row level security;
create policy iso_notas  on notas  for select using (escola_id = escola_atual());
create policy iso_faltas on faltas for select using (escola_id = escola_atual());
