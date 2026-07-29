-- Modulo de Provas (Fase 3): geracao assistida por IA, revisao do professor,
-- resposta do aluno e correcao/feedback via RAG.

do $$ begin
  create type status_prova as enum ('rascunho', 'publicada', 'encerrada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_questao as enum ('objetiva', 'dissertativa');
exception when duplicate_object then null; end $$;

create table if not exists provas (
  id              uuid primary key default gen_random_uuid(),
  escola_id       uuid not null references escolas(id) on delete cascade,
  professor_id    uuid not null references usuarios(id) on delete cascade,
  turma_id        uuid not null references turmas(id) on delete cascade,
  titulo          text not null,
  assunto         text not null,
  disciplina      text not null default 'matematica',
  numero_questoes int  not null,
  status          status_prova not null default 'rascunho',
  publicada_em    timestamptz,
  criado_em       timestamptz not null default now()
);

create table if not exists questoes (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  prova_id      uuid not null references provas(id) on delete cascade,
  ordem         int  not null,
  tipo          tipo_questao not null,
  enunciado     text not null,
  alternativas  jsonb,              -- [{letra,texto}]; null em dissertativa
  gabarito      text not null,      -- letra correta (objetiva) ou resolucao modelo (dissertativa)
  explicacao    text,               -- passo a passo/feedback estatico gerado na criacao
  criado_em     timestamptz not null default now(),
  unique (prova_id, ordem)
);

create table if not exists respostas (
  id                  uuid primary key default gen_random_uuid(),
  escola_id           uuid not null references escolas(id) on delete cascade,
  questao_id          uuid not null references questoes(id) on delete cascade,
  aluno_id            uuid not null references usuarios(id) on delete cascade,
  resposta_aluno      text,
  correta             boolean,          -- so objetiva
  nota                numeric(5,2),     -- normalizada 0-10 nos dois tipos
  feedback_ia         text,             -- cache do feedback gerado (evita re-chamar o LLM)
  gabarito_consultado boolean not null default false,
  respondida_em       timestamptz not null default now(),
  unique (questao_id, aluno_id)
);

create index if not exists idx_provas_escola     on provas(escola_id);
create index if not exists idx_provas_professor  on provas(professor_id);
create index if not exists idx_provas_turma      on provas(turma_id);
create index if not exists idx_questoes_escola   on questoes(escola_id);
create index if not exists idx_questoes_prova    on questoes(prova_id);
create index if not exists idx_respostas_escola  on respostas(escola_id);
create index if not exists idx_respostas_questao on respostas(questao_id);
create index if not exists idx_respostas_aluno   on respostas(aluno_id);

alter table provas    enable row level security;
alter table questoes  enable row level security;
alter table respostas enable row level security;
create policy iso_provas    on provas    for select using (escola_id = escola_atual());
create policy iso_questoes  on questoes  for select using (escola_id = escola_atual());
create policy iso_respostas on respostas for select using (escola_id = escola_atual());
