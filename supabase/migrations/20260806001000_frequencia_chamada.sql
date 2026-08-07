-- =====================================================================
-- Frequencia / chamada (Frente 4). Ate aqui so havia registro de AUSENCIA
-- (tabela faltas). Agora o professor faz a CHAMADA da turma numa data: marca
-- cada aluno como presente ou ausente (flag), com opcao de justificar. Uma
-- ausencia registrada e o gatilho para avisar o responsavel (Frente 5).
-- Convencao: identificadores em portugues, sem acento, snake_case.
-- =====================================================================

create table if not exists presencas (
  id           uuid primary key default gen_random_uuid(),
  escola_id    uuid not null references escolas(id) on delete cascade,
  turma_id     uuid not null references turmas(id) on delete cascade,
  aluno_id     uuid not null references usuarios(id) on delete cascade,
  professor_id uuid references usuarios(id) on delete set null,
  data         date not null,
  presente     boolean not null default true,
  justificada  boolean not null default false,   -- so relevante quando ausente
  motivo       text,
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (turma_id, aluno_id, data)
);

create index if not exists idx_presencas_escola on presencas(escola_id);
create index if not exists idx_presencas_turma_data on presencas(turma_id, data);
create index if not exists idx_presencas_aluno on presencas(aluno_id);

alter table presencas enable row level security;
create policy iso_presencas on presencas for select using (escola_id = escola_atual());
