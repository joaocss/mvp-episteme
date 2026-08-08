-- =====================================================================
-- Tokens de senha: convite (definir a 1a senha) e redefinicao (reset).
-- O usuario recebe por email um link com um token; ao abrir, define a propria
-- senha. Guardamos o HASH do token (sha256), nunca o token cru. Token e de uso
-- unico e expira (convite: dias; reset: horas). Substitui a senha fixa do piloto.
-- Convencao: identificadores em portugues, sem acento, snake_case.
-- =====================================================================

create table if not exists senha_tokens (
  id          uuid primary key default gen_random_uuid(),
  escola_id   uuid not null references escolas(id)  on delete cascade,
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  tipo        text not null check (tipo in ('convite','reset')),
  token_hash  text not null,             -- sha256(token) em hex
  expira_em   timestamptz not null,
  usado_em    timestamptz,
  criado_em   timestamptz not null default now()
);

create index if not exists idx_senha_tokens_hash    on senha_tokens(token_hash);
create index if not exists idx_senha_tokens_usuario on senha_tokens(usuario_id);

-- RLS: o acesso e sempre pelo pool privilegiado do servidor (o fluxo e publico,
-- sem sessao). Habilitamos RLS sem policy de leitura para bloquear qualquer
-- acesso por papel client-side; o servidor (dono/privilegiado) segue operando.
alter table senha_tokens enable row level security;
