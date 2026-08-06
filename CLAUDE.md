# CLAUDE.md — Episteme (mvp-episteme)

> Contexto permanente do projeto para o Claude Code. Leia este arquivo antes de agir.
> Também consulte `docs/MANUTENCAO_E_ESTADO.md`, `docs/Identidade_Visual.md` e
> `MEMORIA_EPISTEME.md` (na pasta pai) para detalhes de estado, marca e deploy.

## Produto

**Episteme** — *"Inteligência que ensina a pensar"*. SaaS educacional cujo coração é
um tutor de IA. Filosofia central: a IA é **parceira cognitiva** que faz o aluno
pensar, **não** um atalho que entrega a resposta pronta (combate à "descarga
cognitiva"). Toda resposta da IA é **ancorada no material da escola (RAG)**; se a
pergunta foge do material, a IA recusa e sugere falar com o professor.

Módulo 1 em produção: Tutor de Matemática do 6º ano. Três pilares de usuário:
**Gestor**, **Professor**, **Aluno** (e, no futuro, **Responsável**).

## Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript.
- **Estilo:** TailwindCSS 3 com tokens da marca; UI "shadcn-style" híbrida
  (class-variance-authority + clsx + tailwind-merge) em `app/componentes/ui`.
- **Backend/DB:** Supabase (PostgreSQL 17) acessado por `pg` (pool direto) em
  `src/bd/pool.ts`. Multi-tenant por `escola_id` em todas as tabelas.
- **Vetores/RAG:** pgvector (dimensão **768** = OpenAI `text-embedding-3-small`
  com `dimensions: 768`).
- **IA (fábricas trocáveis por env):** `src/ia/fabricaLlm.ts` e
  `fabricaEmbeddings.ts`. Padrão **OpenAI** (`gpt-4o-mini` + `text-embedding-3-small`),
  provedor efetivamente usado hoje em dev e produção; Gemini e Ollama ficam
  disponíveis como opção trocável por env, mas não estão em uso. Gemini foi o
  provedor original do projeto, trocado por OpenAI logo no início — não usar
  essa referência em docs novas. `USAR_MOCK=1` para testes. **Não** trocar para
  infra cara (Redis/Pinecone) sem decisão explícita — o projeto é
  deliberadamente enxuto por custo.
- **Deploy:** Vercel (deploy automático no `git push` do `main`).

## Convenções de código (IMPORTANTE)

- **Todo identificador em português, sem acento**: variáveis, funções, classes,
  arquivos. Case idiomático por linguagem (camelCase no TS, snake_case no SQL,
  PascalCase em componentes/classes). Palavras-chave SQL em inglês.
- Comentários em português.
- Componentes React em PascalCase e em português (ex.: `Botao`, `Cartao`,
  `TabelasGestao`, `GraficosGestor`).

## Estrutura

```
codigo/
├── app/                      # Next App Router (páginas + rotas de API)
│   ├── page.tsx              # home (identidade Episteme)
│   ├── login/                # login → redireciona para /paineis
│   ├── paineis/              # "Painéis de Acesso" pós-login (cards por perfil)
│   ├── dashboard/{gestor,professor,aluno}/  # valida papel (RBAC) → módulo
│   ├── gestor/               # painel gestor (KPIs + gráficos Recharts)
│   │   ├── GraficosGestor.tsx
│   │   └── gestao/           # cadastros: FormulariosGestao + TabelasGestao (CRUD)
│   ├── professor/            # painel professor (stats, sessões, planejamento)
│   ├── tutor/                # chat do aluno com o tutor
│   ├── componentes/          # Marca + ui/ (Botao, Cartao)
│   └── api/                  # rotas: login, cadastro, gestor/gestao, tutor/*, professor/*
├── src/
│   ├── bd/                   # acesso ao Postgres (pool, gestao, gestor, professor, aluno, modulos…)
│   ├── ia/                   # fábricas + provedores (gemini/openai/ollama/mock), guardrails
│   ├── modulos/             # registro.ts: catálogo de módulos (FONTE DE VERDADE da nav)
│   └── rag/                  # pipeline do tutor, ingestão, repositórios, planejamento
├── lib/                      # sessao (cookie HMAC), senha (hash), utils (cn)
├── supabase/migrations/      # FONTE DE VERDADE do schema (aplicada pelo CLI)
└── docs/                     # Identidade_Visual, MANUTENCAO_E_ESTADO, Conformidade_Legal
```

## Comandos

```bash
npm run dev          # desenvolvimento (localhost:3000) — rode UMA instância só
npm run build        # build de produção (o mesmo que a Vercel roda)
npm run typecheck    # tsc --noEmit
npm run demo:rag     # exercita o pipeline de RAG

supabase start           # sobe o Supabase LOCAL (Docker) — necessário p/ dev
supabase migration up    # aplica migrations pendentes no banco LOCAL
supabase db push         # aplica migrations no projeto CLOUD linkado
```

## Ambiente e segredos

- `.env.local` (git-ignored) guarda as chaves. Em **dev** aponta para o Supabase
  **local**: `DATABASE_URL=...@127.0.0.1:54322`, `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`.
- `pool.ts` liga SSL automaticamente quando o host **não** é local.
- **Produção (Vercel):** o `.env.local` NÃO vale. Configure no painel da Vercel:
  `DATABASE_URL` = string do **pooler** do Supabase Cloud (`...pooler.supabase.com:6543`),
  `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, chaves de IA e
  `SESSION_SECRET`. Projeto Cloud linkado: ref **gkycodihvnnrfldibywy**.
- **Nunca** commitar segredos. Rotacionar as credenciais de teste antes de dados reais.

## Estado atual (última atualização: 30/07/2026)

Sistema no ar (GitHub `joaocss/mvp-episteme` → Vercel → Supabase). Concluído:

- **RAG completo** com grounding e recusa fora de escopo; memória de conversa em Postgres.
- **Identidade visual** implementada (tokens roxo `#3B2C63`/dourado/creme, títulos
  serifados; `tailwind.config.ts` + `app/globals.css`).
- **Fase 1** — Painéis de Acesso (`/paineis`), rotas `/dashboard/{papel}` com RBAC,
  middleware protegendo rotas, base de UI shadcn-style (`Botao`, `Cartao`, `cn()`).
- **Fase 2** — CRUD completo do Gestor (editar/excluir turmas, professores, alunos;
  definir turma do aluno; desvincular professor), tabelas filtráveis com edição
  inline, gráficos com **Recharts**, migration `20260729000200_gestao_campos`
  (colunas `data_nascimento` e `disciplinas` em `usuarios`).
- **Fase 3 — Módulo Provas:** migration `20260730000100_provas` (`provas`,
  `questoes` com `tipo` objetiva/dissertativa por questão, `respostas`).
  Professor: "Elaborar Prova" (`/professor/provas/nova`, assunto + nº de
  questões objetivas/dissertativas → IA gera rascunho via RAG e já persiste em
  `status='rascunho'`), revisão/edição inline por questão e publicação
  (`/professor/provas/[id]`). Aluno: uma questão por vez (`/provas/[id]`),
  botões "Feedback da Questão"/"Consultar Gabarito" (objetiva) e "Ver Passo a
  Passo"/"Feedback da Resposta" (dissertativa, IA compara com o gabarito),
  resposta única por questão, tela de resultado ao concluir (acertos/erros/nota
  + feedback por questão). Pipeline de IA em `src/rag/provas.ts` (reusa
  `LIMIAR_GROUNDING`, guardrails e `RepositorioPostgres` do tutor). Gráficos de
  **notas/aprovação/evasão** habilitados no painel do gestor
  (`mediaNotasPorTurma`/`taxaAprovacaoPorTurma`/`evasaoAlunos` em `src/bd/gestor.ts`;
  evasão = sem resposta de prova nem interação com o tutor em ~14 dias).
  `middleware.ts` protege `/provas` e `/api/provas`.

  - **Fase 4 — Memória de contexto:** ao continuar uma sessão existente (mesmo
  `sessaoId`), `buscarHistoricoRecente` (`src/rag/repositorioConversas.ts`)
  traz os turnos da conversa com `criado_em` dentro do TTL de 7 dias
  (`now() - interval '7 days'`); `responder()` (`src/rag/tutor.ts`) recebe esse
  histórico e o injeta no prompt em uma seção `### CONVERSA ANTERIOR` (nova
  sessão ou sessão "fria", sem histórico dentro do TTL = seção omitida). O
  histórico já persistido em `interacoes` continua visível para o aluno em
  `/api/tutor/historico` e `/api/tutor/conversa` independente do TTL — o TTL só
  afeta o que é usado como contexto do modelo, não a visibilidade.

- **Fase 5 — Cadastro estendido, notas/faltas, correção manual, dashboards e
  personalização:** migrations `20260730000200` a `600`. `responsaveis` (1:N
  por aluno) e colunas `endereco_familia`/`estado_civil_pais`/`pais_moram_juntos`
  em `usuarios`, editáveis em `/gestor/gestao` (painel "Família" por aluno).
  `notas` e `faltas` (situação `justificada`/`nao_justificada`) lançadas pelo
  professor em `/professor/desempenho`. Correção manual de provas em
  `/professor/provas/[id]/corrigir` (`respostas.nota_manual`/`feedback_professor`;
  `nota_efetiva` = `coalesce(nota_manual, nota)`, coluna gerada). Dashboard de
  notas/acertos por questão em `/professor/desempenho` (turmas do professor) e
  `/gestor/desempenho` (toda a escola), com lista de alunos por turma
  (`src/bd/notas.ts`). `configuracoes_escola` (logo + `nota_maxima`/
  `nota_minima_aprovacao`) editável em `/gestor/configuracoes`. Gestor ganhou
  acesso a `auditoria`/`guardrail_eventos` de toda a escola em `/gestor/logs`
  (RLS `audit_select`/`guardrail_select` atualizadas para incluir `gestor`).
  Script `local/criar_escola.ts` provisiona uma nova escola + gestor (hoje só
  a Escola Demonstração está em uso).

- **Fase 6 — Tutor em camadas, feedback didático e multimodal:** no chat livre
  (não no gerador de questões, que continua estritamente livro-only), a busca
  agora tem 3 níveis: livro da escola (`LIMIAR_GROUNDING`) → habilidade BNCC
  mais próxima (`LIMIAR_BNCC`, função `buscar_bncc_similar`, migration
  `20260730000700`) → conhecimento geral do modelo. A origem é sempre exposta
  ao aluno (`origemResposta` no retorno de `responder()`; badge no chat).
  `REGRAS_SISTEMA` e os prompts de feedback de provas (`src/rag/provas.ts`)
  pedem explicação passo a passo em markdown; `app/tutor` e `app/provas/[id]`
  renderizam com `react-markdown` (classe `.prose-tutor` em `globals.css`).
  Aluno pode continuar perguntando sobre uma questão de prova que não entendeu
  (`tirarDuvidaSobreQuestao`, componente `DuvidaQuestao.tsx`, reusa o pipeline
  do tutor com o contexto da questão como histórico). Tutor multimodal: aluno
  anexa uma foto (`ProvedorLlm.gerar(prompt, { imagemBase64 })`, suportado hoje
  só pela OpenAI via `image_url`); quando nem livro nem BNCC cobrem o assunto e
  há imagem, ela vira a fonte principal (`origemResposta: "imagem"`).

- **Fase 8 — Conteúdo escopado por turma + ingestão de PDF in-app** (migration
  `20260803000100`): catálogo de `disciplinas` por escola (gestor cria/edita),
  vínculo M:N material↔turma (`materiais_turmas`) e `turmas.modo_estrito`.
  `buscar_trechos` ganhou `p_turma_id` (null = comportamento legado por
  disciplina/série). Upload de PDF pelo professor/diretor em `/gestor/materiais`
  e `/professor/materiais` (componente `app/componentes/GestaoMateriais.tsx`):
  rota `app/api/materiais` cria o material, vincula turmas e ingere
  (`src/rag/ingestaoPdf.ts` → `extrairPdf.ts` com **unpdf** → `chunkarTexto` →
  embeddings → `material_chunks`). Catálogo de disciplinas em
  `app/api/gestor/disciplinas`. Tutor (`src/rag/tutor.ts` + `app/api/tutor`)
  escopa a busca à turma do aluno **quando a turma já tem material próprio**
  (`turmaDoAluno` em `src/bd/aluno.ts`); com `modo_estrito` ligado, recusa fora
  do material da turma (não usa BNCC/geral). Sem material vinculado, a turma
  mantém o comportamento legado (não quebra turmas antigas).

- **Fase 9 — Modularização (fundação):** o catálogo de funcionalidades virou um
  **registro de módulos** em `src/modulos/registro.ts` (FONTE DE VERDADE): cada
  módulo é um objeto `{ id, nome, essencial, rotas[] }`, cada rota amarrada aos
  papéis que a veem + `ordem` na nav. `montarNav(papel, habilitados)` deriva a
  barra lateral daí (antes era um mapa estático `NAV_POR_PAPEL` no `LayoutApp`).
  Módulos **essenciais** (tutor, cadastros, segurança, visão-geral, admin) são
  sempre ligados; **opcionais** (provas, planejamento, materiais, desempenho,
  analytics) a escola liga/desliga em `/gestor/modulos` (`PainelModulos.tsx` +
  `app/api/gestor/modulos`). Estado por escola em `modulos_escola` (migration
  `20260806000100`), lido por `src/bd/modulos.ts` — **deploy-safe**: tabela
  ausente = tudo habilitado. Ao adicionar uma feature nova, registrá-la como um
  módulo aqui em vez de hardcodar rota na nav.
  Redesign da tela de Materiais (`GestaoMateriais.tsx`) migrado 100% para os
  tokens/componentes da marca (Cartao/Botao/Campo/Selo) — sem hex hardcoded;
  é o exemplar visual a seguir ao redesenhar outras telas.

- **Fase 10 — Ingestão incremental (porte TS de `rag-ingestao-incremental`):**
  migration `20260806000200_ingestao_incremental`. Conceitos portados da lib
  Python para TypeScript nativo (sem infra Python — decisão de custo+segurança):
  **versionamento** de material (`material_versoes`, uma versão por upload, só
  uma `vigente`), **publish atômico** (a nova versão vira vigente e a anterior
  `substituida` numa transação — sem janela de resposta errada; índice parcial
  `uniq_versao_vigente` garante ≤1 vigente), **dedup por hash** (hash do arquivo
  = idempotência → `duplicada` custo zero; hash de conteúdo por chunk = reuso de
  embeddings entre versões, só re-vetoriza o que mudou — ~86% de reuso medido ao
  editar 1 de 40 parágrafos), **deleção lógica** (`excluido_em`) e **janelas de
  vigência** (`vigencia_inicio/fim`). Código: `src/rag/ingestaoIncremental/`
  (`hashes.ts` puro + `pipeline.ts`) + `src/bd/materiaisVersoes.ts`. A rota
  `app/api/materiais` agora usa `ingerirPdfIncremental` e aceita `materialId`
  para **revisar** um material (nova versão); a UI ganhou selo `v{n}` e botão
  "Nova versão". **Aditivo e backward-compatible**: `material_chunks` legados
  (`versao_id` null) continuam sempre ativos; `buscar_trechos` (mesma assinatura
  de 6 args) só aplica o filtro de versão a chunks versionados. `listarMateriais`
  é deploy-safe (query version-aware com fallback à legada em `42P01/42703`).
  Teste sem banco: `npx tsx local/testarIncremental.ts`. O `ingestaoPdf.ts`
  antigo permanece (não é mais chamado pela rota, mas serve de referência).

- **Fase 11 — Modo Treinador (dever de casa anti-muleta):** migration
  `20260806000300_modo_treinador`. Extensão da filosofia "parceira cognitiva"
  para a tarefa de casa: a IA dá **pistas** e registra o **processo** do aluno,
  sem entregar a resposta. Schema: `treinos` (desafio do professor p/ turma),
  `treino_sessoes` (tentativa de um aluno, `pistas_usadas`/`resposta_final`/
  `reflexao`), `treino_interacoes` (o log do processo: tentativa/pista/
  resposta_final/reflexao). Pipeline `src/rag/treinador.ts` (`orientar()`) reusa
  guardrails/embeddings/grounding do tutor, mas com prompt que **retém a
  resposta** e dá 1 pista socrática por vez (grounding opcional — foco é o
  processo, não um fato do livro). bd em `src/bd/treinos.ts`. Módulo `treinador`
  (opcional) no registry. Rotas: professor `/professor/treinos` (criar/publicar/
  ver processo em `[id]`), aluno `/treinos` (lista) + `/treinos/[id]` (coaching
  chat + resposta final + reflexão). APIs `app/api/treinos` (professor CRUD) e
  `app/api/treino-sessao` (aluno: orientar/concluir). Middleware protege
  `/treinos` e `/api/treino-sessao`.

- **Fase 12 — Prova impressa (PDF), só professor:** rota
  `/professor/provas/[id]/imprimir` — folha standalone (sem o shell) otimizada
  para impressão/PDF, com alternador **Prova (aluno) / Com gabarito** por
  querystring (`?gabarito=1`) e botão que aciona `window.print()` (Salvar como
  PDF do navegador). Sem dependência nova (evita `@react-pdf/renderer`, pesado no
  serverless). Só o professor dono acessa (`obterProvaComQuestoes` filtra por
  `professor_id`). Header com logo/nome da escola, campos nome/data/nota,
  objetivas com bolha da alternativa (destaca a correta no modo gabarito),
  dissertativas com pauta para resposta. Botão "Imprimir prova" em
  `/professor/provas/[id]`. Componente `BarraImpressao.tsx` (some na impressão).

- **Fase 13 — BNCC Português/História:** migration `20260806000400` acrescenta um
  conjunto **curado** (não exaustivo — conferir contra a BNCC oficial) de
  habilidades de Português 6º e História 7º em `competencias_bncc`. Antes só
  Matemática tinha, então a 2ª camada de grounding não funcionava nessas
  disciplinas. Embeddings gerados por `src/rag/ingestaoBncc.ts` (agora só
  vetoriza linhas com `embedding is null` — re-runs baratos). Rodar o script
  após aplicar a migration. Local: matematica 34, historia 12, portugues 10.

- **Fase 14 — Analytics por competência:** `/gestor/relatorios` já tinha filtros
  turma/disciplina/período + CSV; acrescentado o painel "Competências mais
  trabalhadas no tutor" (top habilidades BNCC por `interacoes.competencia_bncc`,
  respeitando os filtros) em `src/bd/relatorios.ts` (`porCompetencia`).

- **Fase 15 — Painel do Responsável:** ativa o papel `responsavel` (antes só card
  "em breve"). Vínculo responsável→aluno **reusa `responsaveis` (Fase 5) por
  email** (sem tabela nova): o responsável loga e vê os alunos cujo registro em
  `responsaveis` tem o mesmo email. `/responsavel` (read-only): notas recentes,
  faltas, treinos concluídos e última atividade no tutor por filho. bd em
  `src/bd/responsavel.ts`. Papel adicionado ao tipo `Papel`, `ROTULO_PAPEL`,
  `ROTA_PAPEL`/`TITULO_PAPEL` (login), middleware e card de `/paineis`.

> **Verificação em runtime (Docker local, 06/ago):** módulos (toggle+nav),
> materiais version-aware, Modo Treinador (loop completo com LLM real, coach
> retém a resposta), BNCC (56 habilidades embeddadas), Responsável (login+vínculo
> por email) — todos OK. Bug achado e corrigido: audit de módulo usava slug em
> coluna UUID (`5e097b3`). Migrations 100/200/300/400 aplicadas no LOCAL; no
> CLOUD ainda não. Provas-PDF não testada em runtime (sem prova no seed).

## Roadmap (ordem do brief)

- **B — Gestão de alunos:** reenturmar aluno (UI; `definirTurmaAluno` já existe),
  importar alunos via planilha (CSV/XLSX), download dos dados dos alunos (só
  diretor, com auditoria).
- **C — Analytics:** melhorar gráficos dos alunos + relatórios com filtros
  (turma/disciplina/período/competência).
- **LGPD/segurança:** adiada por decisão do João — resolver ANTES de dados reais.
- Considerar self-service de cadastro de escola (hoje só via `local/criar_escola.ts`).

## Gotchas / lições aprendidas

- `src/bd/pool.ts` lê `DATABASE_URL` no momento do import. Em scripts standalone
  (tsx), chame `carregarEnvLocal()` (de `src/bd/ambiente.ts`) ANTES de importar o
  pool. No app Next, o `.env.local` é carregado automaticamente.
- Dimensão de embeddings é **768** (OpenAI `text-embedding-3-small`, com o parametro
  `dimensions` fixado em 768). Se trocar de provedor, alinhar a coluna
  `vector(768)` e reingerir.
- RLS das tabelas é `for select`; as **escritas** passam pelo pool privilegiado, então
  SEMPRE restrinja por `escola_id` no `WHERE` para preservar o isolamento.
- "Perdeu a referência com o banco" em dev = Supabase local (Docker) não está rodando
  (`supabase start`). Em produção = variáveis da Vercel apontando para local ou schema/seed
  não aplicados no Cloud.
- Rodar `npm install`/`Remove-Item node_modules` com o dev server ativo trava arquivos
  (`next-swc`). Pare o dev server antes.
- **Ingestão de PDF:** `extrairPdf.ts` faz um polyfill de `Math.sumPrecise` ANTES
  de chamar o unpdf. Sem ele, o pdf.js cai num fallback lento (extração de ~8
  páginas passou de 0,5s para ~55s) — NÃO remover. O `chunkarTexto` subdivide
  parágrafos gigantes por frase (PDF costuma vir sem linha em branco entre
  parágrafos, senão viraria 1 chunk único). Teste sem banco:
  `npx tsx local/testarExtracaoPdf.ts <caminho.pdf>`.
- **Migration `20260803000100` (Fase 8) já foi aplicada** em produção — o commit
  de provisionamento do tenant de demonstração depende dela. (A nota antiga de
  "não aplicada" ficou desatualizada.)
- **Migration `20260806000100_modulos_por_escola` (Fase 9)**: a habilitação de
  módulos por escola é **deploy-safe** — `src/bd/modulos.ts` trata a tabela
  ausente como "tudo habilitado" (try/catch no código `42P01`), então a app não
  quebra antes da migration rodar. Aplicar (`supabase migration up` / `db push`)
  para o toggle em `/gestor/modulos` passar a **persistir**; sem ela, os toggles
  não gravam mas nada quebra.
- **Migration `20260806000200_ingestao_incremental` (Fase 10)**: **aditiva e
  backward-compatible** — chunks legados (`versao_id` null) seguem ativos e
  `listarMateriais` tem fallback à query legada, então a app não quebra antes da
  migration. Aplicar (`supabase migration up` / `db push`) para o versionamento
  e o dedup passarem a valer; sem ela, um upload novo **falha** ao tentar gravar
  em `material_versoes` (a listagem e a busca continuam funcionando). Ordem
  correta: aplicar a migration ANTES de fazer upload de material no ambiente.
- Supabase local exige Docker. No Windows do João, o Docker Desktop
  (`%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe`) precisa ser aberto
  manualmente e concluir o setup na 1ª vez; o daemon não sobe só via CLI.

## Como o Claude deve trabalhar aqui

- Antes de mexer no schema, ler as migrations existentes em `supabase/migrations`.
- Toda mudança: `npm run typecheck` e `npm run build` antes de considerar pronto.
- Manter a identidade visual e os componentes de `app/componentes/ui`.
- Salvar sempre nesta pasta (`codigo/`); versionar com commits pequenos e descritivos.
