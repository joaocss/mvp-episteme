-- =====================================================================
-- Modo Treinador (dever de casa anti-muleta). Extensao da filosofia "parceira
-- cognitiva" para a tarefa de casa: a IA da PISTAS e registra o PROCESSO do
-- aluno (tentativas, pistas, reflexao), sem entregar a resposta pronta. O
-- professor cria um treino (um desafio) para a turma e ve depois como cada
-- aluno pensou.
-- Convencao: identificadores em portugues, sem acento, snake_case.
-- =====================================================================

-- Enums (guardados para nao falhar em reaplicacao).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_treino') then
    create type status_treino as enum ('rascunho','publicado','arquivado');
  end if;
  if not exists (select 1 from pg_type where typname = 'status_treino_sessao') then
    create type status_treino_sessao as enum ('em_andamento','concluido');
  end if;
  if not exists (select 1 from pg_type where typname = 'tipo_treino_interacao') then
    create type tipo_treino_interacao as enum ('tentativa','pista','resposta_final','reflexao','sistema');
  end if;
end $$;

-- 1) Treino: o desafio proposto pelo professor a uma turma.
create table if not exists treinos (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  turma_id      uuid not null references turmas(id) on delete cascade,
  professor_id  uuid not null references usuarios(id) on delete cascade,
  disciplina    text not null,
  titulo        text not null,
  enunciado     text not null,            -- o problema/tarefa que o aluno vai resolver
  objetivo      text,                     -- meta de aprendizagem / competencia (opcional)
  status        status_treino not null default 'rascunho',
  criado_em     timestamptz not null default now()
);

create index if not exists idx_treinos_escola on treinos(escola_id);
create index if not exists idx_treinos_turma  on treinos(turma_id);

-- 2) Sessao: a tentativa de um aluno num treino (um aluno tem uma sessao por treino).
create table if not exists treino_sessoes (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  treino_id     uuid not null references treinos(id) on delete cascade,
  aluno_id      uuid not null references usuarios(id) on delete cascade,
  status        status_treino_sessao not null default 'em_andamento',
  pistas_usadas int not null default 0,
  resposta_final text,
  reflexao      text,
  iniciada_em   timestamptz not null default now(),
  concluida_em  timestamptz,
  unique (treino_id, aluno_id)
);

create index if not exists idx_treinosessoes_escola on treino_sessoes(escola_id);
create index if not exists idx_treinosessoes_treino on treino_sessoes(treino_id);
create index if not exists idx_treinosessoes_aluno  on treino_sessoes(aluno_id);

-- 3) Interacao: o REGISTRO DO PROCESSO (tentativas do aluno, pistas da IA,
--    resposta final e reflexao). E o valor pedagogico: o professor ve o caminho.
create table if not exists treino_interacoes (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  sessao_id     uuid not null references treino_sessoes(id) on delete cascade,
  autor         text not null,            -- 'aluno' | 'ia'
  tipo          tipo_treino_interacao not null,
  conteudo      text not null,
  trace_id      uuid,
  criado_em     timestamptz not null default now()
);

create index if not exists idx_treinoint_escola on treino_interacoes(escola_id);
create index if not exists idx_treinoint_sessao on treino_interacoes(sessao_id);

-- RLS: leitura isolada por escola; escritas pelo pool privilegiado, sempre
-- filtrando por escola_id.
alter table treinos            enable row level security;
alter table treino_sessoes     enable row level security;
alter table treino_interacoes  enable row level security;

create policy iso_treinos           on treinos           for select using (escola_id = escola_atual());
create policy iso_treino_sessoes    on treino_sessoes    for select using (escola_id = escola_atual());
create policy iso_treino_interacoes on treino_interacoes for select using (escola_id = escola_atual());
