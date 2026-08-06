-- =====================================================================
-- LGPD — consentimento parental (art. 14) em modo SOFT: registra o aceite do
-- responsavel ao termo de privacidade, sem bloquear o uso (a decisao de virar
-- gate obrigatorio fica para depois da campanha de consentimento dos alunos ja
-- ativos em producao). Tambem versiona o termo de privacidade da plataforma.
--
-- IMPORTANTE: o texto do termo semeado aqui e um PLACEHOLDER operacional —
-- substituir pelo texto juridico revisado antes de tratar dados reais.
-- Convencao: identificadores em portugues, sem acento, snake_case.
-- =====================================================================

-- Termo de privacidade da plataforma, versionado (global — nao e por escola).
create table if not exists termos_privacidade (
  id         uuid primary key default gen_random_uuid(),
  versao     text not null unique,          -- ex.: '2026-08-v1'
  titulo     text not null,
  conteudo   text not null,                 -- markdown/texto do termo
  vigente    boolean not null default false,
  criado_em  timestamptz not null default now()
);

-- Um unico termo vigente por vez.
create unique index if not exists uniq_termo_vigente on termos_privacidade (vigente) where vigente = true;

insert into termos_privacidade (versao, titulo, conteudo, vigente) values (
  '2026-08-v1',
  'Termo de Privacidade e Consentimento (LGPD)',
  E'Este e um termo PLACEHOLDER, a ser substituido pelo texto juridico revisado.\n\n'
  '## Quem somos\nO Episteme e uma plataforma educacional que oferece um tutor de '
  'inteligencia artificial ancorado no material da propria escola.\n\n'
  '## Quais dados tratamos\nNome, e-mail, turma, notas, faltas e as interacoes do '
  'aluno com o tutor de IA, para fins pedagogicos.\n\n'
  '## Consentimento parental (art. 14 da LGPD)\nO tratamento de dados de criancas e '
  'adolescentes depende do consentimento de ao menos um dos pais ou do responsavel '
  'legal. Ao aceitar, voce autoriza o tratamento descrito acima.\n\n'
  '## Seus direitos\nVoce pode solicitar a qualquer momento o acesso, a correcao, a '
  'portabilidade e a exclusao dos dados, bem como revogar este consentimento, pela '
  'secretaria da escola.\n\n'
  '## Contato\nFale com a secretaria da sua escola para exercer seus direitos.',
  true
) on conflict (versao) do nothing;

-- Registro de consentimento do responsavel para um aluno.
create table if not exists consentimentos (
  id                 uuid primary key default gen_random_uuid(),
  escola_id          uuid not null references escolas(id) on delete cascade,
  aluno_id           uuid not null references usuarios(id) on delete cascade,
  responsavel_email  text not null,
  responsavel_id     uuid references usuarios(id) on delete set null,
  termo_versao       text not null references termos_privacidade(versao),
  canal              text not null default 'painel_responsavel',
  concedido_em       timestamptz not null default now(),
  revogado_em        timestamptz,
  unique (aluno_id, termo_versao, responsavel_email)
);

create index if not exists idx_consent_escola on consentimentos(escola_id);
create index if not exists idx_consent_aluno  on consentimentos(aluno_id);

-- RLS: consentimentos isolados por escola (leitura). termos_privacidade e
-- publico (o termo vigente aparece na pagina publica /privacidade), sem RLS.
alter table consentimentos enable row level security;
create policy iso_consentimentos on consentimentos for select using (escola_id = escola_atual());
