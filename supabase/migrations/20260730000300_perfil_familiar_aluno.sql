-- Cadastro estendido do aluno (Fase 5): dados familiares e responsaveis.
-- Segue o padrao ja usado em usuarios (data_nascimento, atipicidades):
-- campos especificos de aluno ficam direto em usuarios.
alter table usuarios add column if not exists endereco_familia text;
alter table usuarios add column if not exists estado_civil_pais text; -- texto livre: 'casados', 'divorciados', 'uniao estavel', etc.
alter table usuarios add column if not exists pais_moram_juntos boolean;

-- Um aluno pode ter varios responsaveis (mae, pai, avo, tutor legal...).
create table if not exists responsaveis (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  aluno_id      uuid not null references usuarios(id) on delete cascade,
  nome          text not null,
  parentesco    text not null,     -- 'mae' | 'pai' | 'avo' | 'tutor legal' | ...
  telefone      text,
  email         text,
  criado_em     timestamptz not null default now()
);

create index if not exists idx_responsaveis_escola on responsaveis(escola_id);
create index if not exists idx_responsaveis_aluno   on responsaveis(aluno_id);

alter table responsaveis enable row level security;
create policy iso_responsaveis on responsaveis
  for select using (escola_id = escola_atual());
