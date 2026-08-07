-- =====================================================================
-- Inclusao / aluno atipico (Frente 2). Marca se o aluno e atipico, guarda
-- observacoes descritivas e permite anexar laudos/fotos (Supabase Storage).
-- Esses dados alimentam a geracao de um plano de aula INCLUSIVO e especifico
-- pela IA (Frente 3). Bucket PRIVADO: os arquivos so sao acessados pelo backend
-- (service_role), nunca direto do cliente.
-- Convencao: identificadores em portugues, sem acento, snake_case.
-- =====================================================================

-- 1) Campos de atipicidade no aluno (usuarios ja tem atipicidades/adaptacoes
--    jsonb legados; aqui um par simples e direto para a UI e a IA).
alter table usuarios
  add column if not exists atipico boolean not null default false;
alter table usuarios
  add column if not exists observacoes_atipicidade text;

-- 2) Anexos do aluno (laudos, fotos, relatorios). O binario vive no Storage;
--    aqui guardamos so os metadados + o caminho.
create table if not exists aluno_anexos (
  id          uuid primary key default gen_random_uuid(),
  escola_id   uuid not null references escolas(id) on delete cascade,
  aluno_id    uuid not null references usuarios(id) on delete cascade,
  nome        text not null,            -- nome original do arquivo
  tipo        text,                     -- content-type
  tamanho     int,                      -- bytes
  caminho     text not null,            -- caminho no bucket (escola/aluno/uuid-nome)
  criado_em   timestamptz not null default now()
);

create index if not exists idx_alunoanexos_escola on aluno_anexos(escola_id);
create index if not exists idx_alunoanexos_aluno  on aluno_anexos(aluno_id);

alter table aluno_anexos enable row level security;
create policy iso_aluno_anexos on aluno_anexos
  for select using (escola_id = escola_atual());

-- 3) Bucket privado para os anexos (idempotente).
insert into storage.buckets (id, name, public)
values ('anexos-alunos', 'anexos-alunos', false)
on conflict (id) do nothing;
