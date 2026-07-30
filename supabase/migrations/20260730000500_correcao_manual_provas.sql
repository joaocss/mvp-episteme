-- Correcao manual de provas (Fase 5): o professor pode revisar e sobrescrever
-- a nota/feedback gerados automaticamente (objetiva) ou pela IA (dissertativa).
alter table respostas add column if not exists nota_manual        numeric(5,2);
alter table respostas add column if not exists feedback_professor text;
alter table respostas add column if not exists corrigido_por      uuid references usuarios(id) on delete set null;
alter table respostas add column if not exists corrigido_em       timestamptz;

-- nota_efetiva: nota_manual quando existir (corrigida pelo professor), senao a nota automatica/IA.
alter table respostas add column if not exists nota_efetiva numeric(5,2)
  generated always as (coalesce(nota_manual, nota)) stored;
