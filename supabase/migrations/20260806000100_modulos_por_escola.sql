-- =====================================================================
-- Modularizacao: quais modulos (opcionais) cada escola tem habilitados.
--
-- O catalogo de modulos vive no codigo (src/modulos/registro.ts). Aqui so
-- guardamos, por escola, o estado dos modulos OPCIONAIS que fogem do padrao.
-- Convencao: ausencia de linha = modulo habilitado (padrao ligado). Modulos
-- essenciais nunca aparecem aqui (sao sempre ligados no codigo). Assim uma
-- escola nova ja nasce com tudo ligado, sem precisar semear nada.
-- Identificadores em portugues, sem acento, snake_case.
-- =====================================================================

create table if not exists modulos_escola (
  id         uuid primary key default gen_random_uuid(),
  escola_id  uuid not null references escolas(id) on delete cascade,
  modulo_id  text not null,               -- slug do modulo (registro.ts), ex.: 'provas'
  habilitado boolean not null default true,
  criado_em  timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (escola_id, modulo_id)
);

create index if not exists idx_modulos_escola on modulos_escola(escola_id);

-- RLS: leitura isolada por escola; escritas passam pelo pool privilegiado do
-- backend, sempre filtrando por escola_id.
alter table modulos_escola enable row level security;

create policy iso_modulos_escola on modulos_escola
  for select using (escola_id = escola_atual());
