-- Personalizacao por escola (Fase 5): logo e escala de nota flexivel.
-- Uma linha por escola; criada sob demanda pela aplicacao (upsert) na
-- primeira vez que o gestor salva as configuracoes.
create table if not exists configuracoes_escola (
  escola_id             uuid primary key references escolas(id) on delete cascade,
  logo_url              text,
  nota_maxima           numeric(5,2) not null default 10,
  nota_minima_aprovacao numeric(5,2) not null default 6,
  atualizado_em         timestamptz not null default now()
);

alter table configuracoes_escola enable row level security;
create policy iso_config_escola on configuracoes_escola
  for select using (escola_id = escola_atual());
