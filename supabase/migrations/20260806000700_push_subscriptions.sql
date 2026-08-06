-- =====================================================================
-- Notificacoes push (PWA / Web Push). Guarda a inscricao (subscription) do
-- navegador de cada usuario para o servidor conseguir enviar notificacoes
-- (ex.: novo treino/prova publicado, feedback pronto). Isolamento por escola.
-- Convencao: identificadores em portugues, sem acento, snake_case.
-- =====================================================================

create table if not exists push_inscricoes (
  id         uuid primary key default gen_random_uuid(),
  escola_id  uuid not null references escolas(id) on delete cascade,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  criado_em  timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists idx_push_escola  on push_inscricoes(escola_id);
create index if not exists idx_push_usuario on push_inscricoes(usuario_id);

alter table push_inscricoes enable row level security;
create policy iso_push_inscricoes on push_inscricoes
  for select using (escola_id = escola_atual());
