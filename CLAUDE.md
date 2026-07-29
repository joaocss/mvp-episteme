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
- **Vetores/RAG:** pgvector (dimensão **768** = Gemini `text-embedding-004`).
- **IA (fábricas trocáveis por env):** `src/ia/fabricaLlm.ts` e
  `fabricaEmbeddings.ts`. Padrão **Gemini** (barato); OpenAI e Ollama opcionais;
  `USAR_MOCK=1` para testes. **Não** trocar para infra cara (Redis/Pinecone) sem
  decisão explícita — o projeto é deliberadamente enxuto por custo.
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
│   ├── bd/                   # acesso ao Postgres (pool, gestao, gestor, professor, aluno…)
│   ├── ia/                   # fábricas + provedores (gemini/openai/ollama/mock), guardrails
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

## Estado atual (última atualização: 29/07/2026)

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

## Roadmap (ordem do brief)

- **Fase 3 — Módulo Provas (§3/§4 do brief, PRÓXIMO):**
  - Migration nova: `provas`, `questoes`, `respostas` (multi-tenant por `escola_id`).
  - Professor: "Elaborar Prova" (assunto + nº de questões → IA gera rascunho via RAG),
    supervisionar/editar cada questão (texto, alternativas, gabarito), publicar p/ turma.
  - Aluno: prova objetiva uma questão por vez; botões "Feedback da Questão" e
    "Consultar Gabarito"; prova dissertativa com "Ver Passo a Passo" e
    "Feedback da Resposta" (IA compara com gabarito). Tudo ancorado no RAG.
  - Habilita os gráficos de **notas/aprovação/evasão** no painel do gestor (hoje sem fonte).
- **Fase 4 — Memória de contexto:** TTL de ~7 dias e retomar conversa mantendo contexto.
- **Imagens nas respostas:** react-markdown/SVG quando o RAG permitir.
- **LGPD/segurança:** adiada por decisão do João — resolver ANTES de dados reais.

## Gotchas / lições aprendidas

- `src/bd/pool.ts` lê `DATABASE_URL` no momento do import. Em scripts standalone
  (tsx), chame `carregarEnvLocal()` (de `src/bd/ambiente.ts`) ANTES de importar o
  pool. No app Next, o `.env.local` é carregado automaticamente.
- Dimensão de embeddings é **768** (Gemini). Se trocar de provedor, alinhar a coluna
  `vector(768)` e reingerir.
- RLS das tabelas é `for select`; as **escritas** passam pelo pool privilegiado, então
  SEMPRE restrinja por `escola_id` no `WHERE` para preservar o isolamento.
- "Perdeu a referência com o banco" em dev = Supabase local (Docker) não está rodando
  (`supabase start`). Em produção = variáveis da Vercel apontando para local ou schema/seed
  não aplicados no Cloud.
- Rodar `npm install`/`Remove-Item node_modules` com o dev server ativo trava arquivos
  (`next-swc`). Pare o dev server antes.

## Como o Claude deve trabalhar aqui

- Antes de mexer no schema, ler as migrations existentes em `supabase/migrations`.
- Toda mudança: `npm run typecheck` e `npm run build` antes de considerar pronto.
- Manter a identidade visual e os componentes de `app/componentes/ui`.
- Salvar sempre nesta pasta (`codigo/`); versionar com commits pequenos e descritivos.
