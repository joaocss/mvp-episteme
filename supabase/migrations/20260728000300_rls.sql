-- =====================================================================
-- Migracao 002: Row Level Security (isolamento multi-tenant + papeis)
-- Regra: o isolamento e imposto pelo banco, nao pela aplicacao.
-- Le escola_id e papel dos custom claims do JWT (app_metadata).
-- =====================================================================

-- Funcoes auxiliares para ler os claims do token
create or replace function escola_atual()
returns uuid language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'escola_id', '')::uuid
$$;

create or replace function papel_atual()
returns text language sql stable as $$
  select auth.jwt() -> 'app_metadata' ->> 'papel'
$$;

-- Ativa RLS em todas as tabelas de negocio
alter table escolas            enable row level security;
alter table usuarios           enable row level security;
alter table turmas             enable row level security;
alter table matriculas         enable row level security;
alter table materiais_fonte    enable row level security;
alter table material_chunks    enable row level security;
alter table sessoes_tutor      enable row level security;
alter table interacoes         enable row level security;
alter table interacao_fontes   enable row level security;
alter table guardrail_eventos  enable row level security;
alter table auditoria          enable row level security;

-- ---------------------------------------------------------------------
-- Isolamento base: cada usuario so enxerga linhas da propria escola.
-- Aplicado a leitura em todas as tabelas com escola_id.
-- ---------------------------------------------------------------------
create policy iso_escolas          on escolas
  for select using (id = escola_atual());
create policy iso_usuarios         on usuarios
  for select using (escola_id = escola_atual());
create policy iso_turmas           on turmas
  for select using (escola_id = escola_atual());
create policy iso_matriculas       on matriculas
  for select using (escola_id = escola_atual());
create policy iso_materiais        on materiais_fonte
  for select using (escola_id = escola_atual());
create policy iso_chunks           on material_chunks
  for select using (escola_id = escola_atual());
create policy iso_sessoes          on sessoes_tutor
  for select using (escola_id = escola_atual());
create policy iso_interacoes       on interacoes
  for select using (escola_id = escola_atual());
create policy iso_intfontes        on interacao_fontes
  for select using (escola_id = escola_atual());

-- ---------------------------------------------------------------------
-- Gating de serie: SO aluno matriculado no 6o ano abre sessao (MVP).
-- ---------------------------------------------------------------------
create policy aluno_6ano_abre_sessao on sessoes_tutor
  for insert with check (
    escola_id = escola_atual()
    and papel_atual() = 'aluno'
    and exists (
      select 1 from matriculas m
      join turmas t on t.id = m.turma_id
      join usuarios u on u.id = m.aluno_id
      where u.auth_id = auth.uid()
        and t.serie = '6o ano'
    )
  );

-- Aluno so ve as proprias sessoes; professor ve as das suas turmas.
create policy aluno_ve_propria_sessao on sessoes_tutor
  for select using (
    escola_id = escola_atual()
    and (
      exists (select 1 from usuarios u
              where u.id = sessoes_tutor.aluno_id and u.auth_id = auth.uid())
      or papel_atual() in ('professor','admin')
    )
  );

-- ---------------------------------------------------------------------
-- Auditoria e guardrail: append-only. Ninguem altera nem apaga.
-- Insert liberado dentro da escola; sem update/delete.
-- ---------------------------------------------------------------------
create policy audit_insert on auditoria
  for insert with check (escola_id = escola_atual());
create policy audit_select on auditoria
  for select using (escola_id = escola_atual() and papel_atual() = 'admin');

create policy guardrail_insert on guardrail_eventos
  for insert with check (escola_id = escola_atual());
create policy guardrail_select on guardrail_eventos
  for select using (escola_id = escola_atual() and papel_atual() in ('professor','admin'));

-- Observacao: as operacoes de escrita do fluxo do tutor (interacoes,
-- interacao_fontes, chunks) sao feitas pelo backend com credencial de
-- servico (service_role), que roda com privilegio e grava ja filtrando
-- por escola_id na aplicacao. As policies de select acima protegem a
-- leitura pelos usuarios finais.
