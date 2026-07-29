# Episteme — Estado do Projeto e Guia de Manutenção

*Documento vivo. Última atualização automática: 29/07/2026.*

## 1. O que é

SaaS educacional multi-tenant. Módulo 1: **tutor de IA de Matemática do 6º ano** (RAG sobre o livro didático + BNCC), com painéis de professor e gestor, planejamento de aulas com IA e cadastro pela gestão. Filosofia: **IA como parceira cognitiva** (ensina a pensar, não entrega respostas).

- Repositório: `github.com/joaocss/mvp-episteme` (a raiz do repo é a pasta `codigo`).
- App em produção (Vercel): `https://mvp-episteme-nu8r.vercel.app`

## 2. Ferramentas e tecnologias

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript / Node.js |
| Frontend | Next.js 15 (App Router) + React 19 + Tailwind |
| Banco | PostgreSQL (Supabase) + extensão pgvector |
| Acesso ao banco | node-postgres (`pg`), pool compartilhado com SSL (`src/bd/pool.ts`) |
| IA — embeddings | OpenAI `text-embedding-3-small` (768 dim) |
| IA — geração | OpenAI `gpt-4o-mini` |
| Abstração de IA | fábrica de provedores (OpenAI, Gemini, Ollama, mock) via variáveis de ambiente |
| Auth (piloto) | cookie assinado HMAC (`lib/sessao.ts`) + senha pbkdf2 (`lib/senha.ts`) |
| Hospedagem | Vercel (app) + Supabase Cloud (banco) |
| Versionamento | Git + GitHub |

## 3. Fluxo de funcionamento (tutor)

Aluno faz login → escreve dúvida → `/api/tutor` lê o cookie (escola do aluno) → guardrail de entrada (PII, injection, segurança infantil) → embedding da pergunta (OpenAI) → busca vetorial no pgvector isolada por escola (`buscar_trechos`) → grounding (sem base = recusa, não inventa) → monta prompt (regras + trechos) → LLM `gpt-4o-mini` → guardrail de saída → resposta ancorada. Tudo é persistido (`sessoes_tutor`, `interacoes`, `interacao_fontes`, `guardrail_eventos`, `auditoria`) com `trace_id`. A pergunta é classificada na habilidade BNCC mais próxima.

Papéis: **aluno** (tutor + histórico), **professor** (painel da sua turma: conversas, alertas, competências, export, planos de ensino), **gestor** (dashboard macro + cadastro de turmas/professores/alunos + vínculos).

## 4. Estrutura do repositório

```
codigo/
  app/            # Next.js: login, tutor, professor, gestor, api/*
  src/ia/         # provedores + fábricas + guardrails
  src/rag/        # ingestão, chunker, busca, tutor (pipeline), planejamento
  src/bd/         # pool, cliente, consultas (alunos, professor, gestor, gestao)
  lib/            # sessao (cookie), senha (pbkdf2)
  supabase/migrations/  # schema, RLS, pgvector, auth, professor, BNCC, senha, planejamento
  supabase/seed.sql     # escola, turmas, usuários de teste + senhas
  docs/           # onboarding, conformidade legal, identidade visual, este arquivo
  public/         # logo-episteme.svg, icone-episteme.svg
```

## 5. Rodar localmente

```powershell
supabase start
supabase db reset          # aplica migrações + seed
# .env.local com OPENAI_API_KEY, EMBEDDING_PROVEDOR=openai, LLM_PROVEDOR=openai,
#   DATABASE_URL local, SESSION_SECRET
npx tsx src/rag/ingestaoBncc.ts
npx tsx src/rag/ingestaoLivro.ts superacao.txt 00000000-0000-0000-0000-000000000001 00000000-0000-0000-0000-000000000010
npm install && npm run dev
```

Logins de teste (senha `episteme123`): aluno `joaosena.cosme@gmail.com`; professor `professor@episteme.teste`; gestor `gestor@episteme.teste`.

## 6. Estado do deploy em nuvem (29/07/2026)

| Item | Estado |
|---|---|
| App na Vercel (build) | Pronto e publicado |
| GitHub `main` | Atualizado (fazer `git push` a cada mudança antes do deploy) |
| Supabase Cloud: migrações | Aplicadas (`supabase db push`) |
| Supabase Cloud: enum `papel_usuario` com `gestor` | Corrigido via SQL na nuvem |
| Supabase Cloud: seed (usuários + senhas) | Aplicado via SQL Editor |
| **Vercel `DATABASE_URL`** | **PENDENTE — usar string do POOLER (ver abaixo)** |
| Ingestão do livro na nuvem | **PENDENTE — rodar da máquina apontando ao pooler** |

### Passos que faltam para o login/tutor funcionarem em produção

1. **Corrigir a `DATABASE_URL` na Vercel** (Settings → Environment Variables → editar) para o **Transaction pooler** (região us-east-1), com o `@` da senha como `%40`:
   ```
   postgresql://postgres.gkycodihvnnrfldibywy:SENHA%40...@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
   Depois **Redeploy**. Se der erro de `prepared statement`, trocar para o **Session pooler** (mesma string, porta **5432**).
2. **Ingerir o livro na nuvem** (da máquina, uma vez), com a string do **Session pooler** (5432) em `DATABASE_URL`:
   ```powershell
   npx tsx src/rag/ingestaoBncc.ts
   npx tsx src/rag/ingestaoLivro.ts superacao.txt 00000000-0000-0000-0000-000000000001 00000000-0000-0000-0000-000000000010
   ```

## 7. Lições aprendidas (evitar retrabalho)

- **Sempre `git push` antes do deploy** — a Vercel parte do GitHub, não da máquina.
- **Conexão direta do Supabase (`db.<ref>.supabase.co`) é IPv6/paga** e não resolve em rede IPv4 → **usar sempre o pooler** (`...pooler.supabase.com`): Transaction (6543) para o app serverless, Session (5432) para scripts/ingestão.
- **Editar uma migração já aplicada não a reexecuta** — na nuvem, aplicar correções (ex.: `alter type ... add value 'gestor'`) direto por SQL.
- **Senha do banco com `@`** precisa virar `%40` na connection string.

## 8. Próximos módulos (roadmap)

Desempenho (acertos/erros por competência) → provas automáticas → tarefas de casa no "modo treinador" (IA dá pistas, não resolve; registra o processo) → cronograma/horários → impressão institucional (marca d'água, cabeçalho, rodapé). Governança: aluno escolhe onde é pertinente; professor e gestor determinam (ver `Compilado_Modulos_e_Permissoes.docx`).

## 9. Segurança

Credenciais usadas no piloto (senha do banco, chaves OpenAI/Google, senhas de teste) devem ser **rotacionadas** antes de uso real. Nada de segredo no Git (`.env.local` e `local/` estão no `.gitignore`). O login atual é de piloto — endurecer (auth real + consentimento parental LGPD) antes de dados reais de alunos.
