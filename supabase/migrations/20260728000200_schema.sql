-- =====================================================================
-- Modulo 1 - Tutor de IA (6o ano / Matematica)
-- Migracao 001: schema base (multi-tenant)
-- Convencao: identificadores em portugues, sem acento, snake_case.
-- Palavras-chave SQL em ingles (sintaxe).
-- =====================================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- Papeis de usuario no sistema
do $$ begin
  create type papel_usuario as enum ('admin', 'professor', 'aluno', 'responsavel', 'gestor');
exception when duplicate_object then null; end $$;

-- Raiz do tenant: uma linha por escola cliente
create table if not exists escolas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  cnpj        text,
  status      text not null default 'ativa',
  criado_em   timestamptz not null default now()
);

-- Usuarios; auth_id liga ao provedor de autenticacao (Supabase Auth)
create table if not exists usuarios (
  id          uuid primary key default gen_random_uuid(),
  escola_id   uuid not null references escolas(id) on delete cascade,
  auth_id     uuid unique,
  papel       papel_usuario not null,
  nome        text not null,
  email       text,
  criado_em   timestamptz not null default now()
);

create table if not exists turmas (
  id          uuid primary key default gen_random_uuid(),
  escola_id   uuid not null references escolas(id) on delete cascade,
  nome        text not null,
  ano_letivo  int  not null,
  serie       text not null,          -- ex.: '6o ano'
  criado_em   timestamptz not null default now()
);

create table if not exists matriculas (
  id          uuid primary key default gen_random_uuid(),
  escola_id   uuid not null references escolas(id) on delete cascade,
  aluno_id    uuid not null references usuarios(id) on delete cascade,
  turma_id    uuid not null references turmas(id) on delete cascade,
  criado_em   timestamptz not null default now(),
  unique (aluno_id, turma_id)
);

-- Catalogo de habilidades da BNCC (ex.: EF06MA01)
create table if not exists competencias_bncc (
  id                uuid primary key default gen_random_uuid(),
  codigo            text not null unique,   -- EF06MA01
  disciplina        text not null,
  ano               text not null,
  unidade_tematica  text,
  objeto            text,
  descricao         text not null
);

-- Materiais-fonte cadastrados pela escola (livro didatico, recorte BNCC)
create table if not exists materiais_fonte (
  id              uuid primary key default gen_random_uuid(),
  escola_id       uuid not null references escolas(id) on delete cascade,
  tipo            text not null,           -- 'livro' | 'bncc' | 'apostila'
  disciplina      text not null,
  ano             text not null,
  titulo          text not null,
  referencia      text,
  status_ingestao text not null default 'pendente',
  criado_em       timestamptz not null default now()
);

-- Trechos vetorizados para o RAG.
-- Dimensao 768 = text-embedding-004 (Gemini). Ajuste conforme o provedor.
create table if not exists material_chunks (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  material_id   uuid not null references materiais_fonte(id) on delete cascade,
  ordem         int  not null,
  texto         text not null,
  metadados     jsonb not null default '{}'::jsonb,
  embedding     vector(768),
  criado_em     timestamptz not null default now()
);

-- Uma conversa do aluno com o tutor
create table if not exists sessoes_tutor (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  aluno_id      uuid not null references usuarios(id) on delete cascade,
  disciplina    text not null default 'matematica',
  iniciada_em   timestamptz not null default now(),
  encerrada_em  timestamptz
);

-- Cada turno da conversa, com telemetria (custo, tokens, latencia, trace)
create table if not exists interacoes (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  sessao_id     uuid not null references sessoes_tutor(id) on delete cascade,
  autor         text not null,           -- 'aluno' | 'ia'
  conteudo      text not null,
  modelo        text,
  tokens_entrada int,
  tokens_saida   int,
  latencia_ms    int,
  custo_estimado numeric(10,6),
  trace_id       uuid,
  criado_em      timestamptz not null default now()
);

-- Rastreia quais trechos embasaram a resposta (grounding)
create table if not exists interacao_fontes (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  interacao_id  uuid not null references interacoes(id) on delete cascade,
  chunk_id      uuid not null references material_chunks(id) on delete cascade,
  score         real not null
);

-- Toda atuacao de guardrail (bloqueio, reescrita, alerta)
create table if not exists guardrail_eventos (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  interacao_id  uuid references interacoes(id) on delete set null,
  categoria     text not null,           -- 'pii' | 'off_topic' | 'seguranca_infantil' | 'injection' | 'toxicidade'
  acao          text not null,           -- 'bloqueado' | 'reescrito' | 'alerta'
  severidade    text not null default 'media',
  detalhe       text,
  trace_id      uuid,
  criado_em     timestamptz not null default now()
);

-- Trilha de auditoria append-only (operacoes sensiveis)
create table if not exists auditoria (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  ator_id       uuid,
  acao          text not null,
  entidade      text,
  entidade_id   uuid,
  ip            inet,
  user_agent    text,
  trace_id      uuid,
  criado_em     timestamptz not null default now()
);

-- Indices: escola_id (chave do isolamento) + estrangeiras mais consultadas
create index if not exists idx_usuarios_escola      on usuarios(escola_id);
create index if not exists idx_turmas_escola        on turmas(escola_id);
create index if not exists idx_matriculas_escola    on matriculas(escola_id);
create index if not exists idx_matriculas_aluno     on matriculas(aluno_id);
create index if not exists idx_materiais_escola     on materiais_fonte(escola_id);
create index if not exists idx_chunks_escola        on material_chunks(escola_id);
create index if not exists idx_chunks_material      on material_chunks(material_id);
create index if not exists idx_sessoes_escola       on sessoes_tutor(escola_id);
create index if not exists idx_interacoes_escola    on interacoes(escola_id);
create index if not exists idx_interacoes_sessao    on interacoes(sessao_id);
create index if not exists idx_intfontes_escola     on interacao_fontes(escola_id);
create index if not exists idx_guardrail_escola     on guardrail_eventos(escola_id);
create index if not exists idx_auditoria_escola     on auditoria(escola_id);

-- Indice vetorial (busca por similaridade). ivfflat exige ANALYZE apos carga.
create index if not exists idx_chunks_embedding
  on material_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
