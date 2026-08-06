# Episteme — Mapeamento Completo do Projeto (manutenção e arquitetura)

*Documento vivo. Última atualização: 06/08/2026 (branch `feat/modularizacao`, Fases 9–18).*

Objetivo deste documento: um dev com conhecimento razoável de web (TypeScript/React/SQL)
deve conseguir, só lendo isto, entender **o que é**, **quais tecnologias e ferramentas**,
**por que cada escolha**, **onde está cada coisa** e **como tudo se conecta** — sem ler
todo o código. Para o dia a dia com o Claude Code, ver também `CLAUDE.md` (mesma pasta raiz do repo).

---

## 1. O que é o Episteme

SaaS educacional **multi-tenant** (uma aplicação, várias escolas, dados isolados por
`escola_id`). O coração é um **tutor de IA** que responde ancorado no material didático da
própria escola (RAG — *Retrieval-Augmented Generation*). Filosofia central: a IA é um
**ANDAIME cognitivo**, não uma muleta — dá pistas, exemplos e analogias e conduz o raciocínio
passo a passo, em vez de entregar a resposta pronta (combate à "descarga cognitiva").

Papéis: **aluno**, **professor**, **gestor** (diretor/coordenação), **admin**, **responsável**.

Repositório: `github.com/joaocss/mvp-episteme` — a **raiz do Git é a pasta `codigo/`**.
Deploy: Vercel (deploy automático a cada `git push` na branch `main`). Banco: Supabase Cloud
(projeto `gkycodihvnnrfldibywy`, região `us-east-1`).

**App em produção:** https://mvp-episteme-nu8r.vercel.app

---

## 2. Stack tecnológica — o quê e POR QUÊ

| Camada | Tecnologia | Por que esta escolha |
|---|---|---|
| Linguagem | **TypeScript 5** | Tipagem estática pega erros de contrato (nome de coluna, shape de API) em build — essencial num projeto com muitas camadas (BD→RAG→API→UI) mantido por humano + IA. |
| Framework (front + back) | **Next.js 15 (App Router)** + **React 19** | Um framework serve páginas *e* rotas de API (`app/api/*`), sem backend separado. Server Components buscam dados direto no banco (sem REST intermediário). Deploy nativo/gratuito na Vercel (mesma empresa do Next). |
| Estilo | **TailwindCSS 3** + tokens da marca | Consistência visual rápida; os tokens (roxo `#3B2C63`, dourado, creme) centralizam a identidade num só lugar (`tailwind.config.ts`). |
| Componentes UI | **class-variance-authority** + **clsx** + **tailwind-merge** | Padrão "shadcn-style": variantes tipadas de componentes (Botão, Selo) sem lib de UI pesada. `cn()` (em `lib/utils.ts`) mescla classes. |
| Banco | **PostgreSQL 17** (via Supabase) | Domínio fortemente relacional (escola→turma→aluno→prova→questão→resposta). JSONB cobre campos flexíveis (alternativas, planos) sem banco de documentos à parte. |
| Vetores (RAG) | **pgvector** (dimensão **768**) | Guarda os embeddings na *mesma* tabela relacional e busca por similaridade com SQL (`buscar_trechos`) — menos peças móveis que Pinecone/Weaviate, e o RLS protege os vetores como qualquer linha. |
| Acesso ao banco | **node-postgres (`pg`)**, pool direto (`src/bd/pool.ts`) | A maioria das consultas é relacional/complexa (joins, agregações p/ dashboards) — SQL puro é mais direto que montar em cima do PostREST. |
| SDK Supabase | **@supabase/supabase-js** + **@supabase/ssr** | Usado no caminho de ingestão em nuvem (chave `service_role`) quando a `DATABASE_URL` do pooler está bloqueada como *sensitive* na Vercel. |
| IA — texto | **OpenAI `gpt-4o-mini`** | Barato e rápido p/ tutor conversacional em produção; suporta **visão** (`image_url`), usado no upload de foto do aluno. |
| IA — embeddings | **OpenAI `text-embedding-3-small`** (`dimensions: 768`) | Mesmo provedor da geração simplifica conta/chave; 768d (em vez de 1536) reduz custo/tempo de busca sem perda perceptível p/ texto didático. |
| Abstração de IA | Fábrica de provedores (`src/ia/fabrica*.ts`) | Trocar provedor (OpenAI/Gemini/Ollama/mock) só mudando env — o pipeline não sabe qual está por trás. `USAR_MOCK=1` p/ testes sem API. |
| Autenticação | Cookie assinado **HMAC** (`lib/sessao.ts`) + senha **pbkdf2** (`lib/senha.ts`) | Solução simples de piloto, sem depender do Supabase Auth. **A endurecer antes de dados reais** (ver §9). |
| Markdown | **react-markdown** | Respostas da IA vêm em markdown (passo a passo, negrito); sem isso o aluno veria `**texto**` cru. |
| Diagramas | **SVG determinístico** próprio (`DiagramaEpisteme.tsx`) | A IA descreve o que ilustrar (`viz` JSON) e o app desenha — **não** usa geração de imagem por IA (que erra matemática). Sempre correto, instantâneo, sem custo. |
| Gráficos | **recharts** | Dashboards do gestor/professor (notas, evasão, distribuição). |
| Extração de PDF | **unpdf** (pdf.js empacotado) | Extrai texto de PDF em ambiente serverless/Node do Next (upload in-app de material). |
| Notificações | **web-push** (Web Push / VAPID) | Notificações push na PWA (novo treino etc.) sem serviço externo pago. |
| Ícones | **lucide-react** (dep) + `Icone.tsx` próprio (SVG inline) | A nav/telas usam um conjunto SVG próprio (`app/componentes/ui/Icone.tsx`) p/ zero dependência de render; `lucide-react` fica disponível. |
| Scripts admin | **tsx** | Roda TypeScript direto (ingestão, seeds) sem build. |

---

## 3. Ferramentas de desenvolvimento e infraestrutura

| Ferramenta | Para quê | Observação |
|---|---|---|
| **Supabase CLI** | Migrations (`supabase migration up` local / `supabase db push` cloud) e sobe o Supabase **local** (Docker). | Fonte de verdade do schema = `supabase/migrations/*.sql` (29 arquivos, em ordem cronológica). |
| **Docker Desktop** | Roda o Supabase local (Postgres+pgvector+Studio+Auth+Storage) em containers `supabase_*_codigo`. | No Windows do João, precisa ser **aberto manualmente** na 1ª vez; o daemon não sobe só via CLI. |
| **Vercel** | Hospedagem + deploy automático a cada push na `main`. Variáveis de ambiente de produção ficam aqui. | A `DATABASE_URL` de prod é marcada **sensitive** (write-only). |
| **GitHub** | `joaocss/mvp-episteme`. A Vercel builda a partir do GitHub, não da máquina local — **sempre `git push` antes de esperar deploy**. | — |
| **web-push CLI** | Gerar par de chaves VAPID: `npx web-push generate-vapid-keys`. | A privada **nunca** é commitada; fica em `.env.local` (dev) / Vercel (prod). |
| **tsc** (`npm run typecheck`) | Checagem de tipos sem build. Rodar sempre antes de considerar pronto. | — |

---

## 4. Mapa de pastas — onde está cada coisa

```
codigo/                          # raiz do repositório Git
├── app/                          # Next.js App Router (páginas + rotas de API)
│   ├── layout.tsx                 # layout raiz (metadata, PWA manifest/theme, RegistrarPWA)
│   ├── page.tsx                   # landing pública
│   ├── paineis/                   # escolha de perfil (pública, pré-login)
│   ├── login/ · auth/sair/        # login (cookie) e logout
│   ├── privacidade/               # termo de privacidade público (LGPD)
│   ├── tutor/                     # chat do aluno (texto + foto + seletor de disciplina)
│   ├── treinos/                   # aluno: lista + sessão de coaching (Modo Treinador)
│   ├── provas/[id]/               # aluno responde prova, questão por questão (+ anti-cópia)
│   ├── responsavel/               # painel do responsável (read-only) + consentimento LGPD
│   ├── professor/
│   │   ├── page.tsx                 # painel: KPIs, sessões, alertas, competências
│   │   ├── assistente/              # IA da equipe (RAG por audiência professor/escola)
│   │   ├── treinos/                 # criar treino + ver processo dos alunos
│   │   ├── provas/                  # elaborar (IA), corrigir, imprimir prova (PDF)
│   │   ├── planos/                  # planejamento de aula com IA
│   │   ├── desempenho/ · materiais/ · sessao/[id]/
│   ├── gestor/
│   │   ├── page.tsx · GraficosGestor.tsx  # dashboard macro (Recharts)
│   │   ├── gestao/                  # CRUD turmas/professores/alunos/vínculos/família
│   │   ├── materiais/ · reenturmar/ · alunos/ · desempenho/
│   │   ├── relatorios/              # relatórios c/ filtros (turma/disciplina/período/competência)
│   │   ├── logs/ · configuracoes/ · modulos/  # auditoria; config da escola; liga/desliga módulos
│   ├── dashboard/{aluno,professor,gestor}/    # redirecionam pro destino real (RBAC)
│   ├── componentes/               # componentes React (ver §4.1)
│   └── api/                        # rotas de API (ver §4.2)
├── src/
│   ├── bd/                        # acesso ao Postgres por domínio (ver §4.3)
│   ├── ia/                        # fábricas de provedor, provedores, guardrails, tipos
│   ├── modulos/registro.ts        # CATÁLOGO DE MÓDULOS — fonte de verdade da navegação
│   ├── notificacoes/push.ts       # envio de Web Push (VAPID)
│   └── rag/                       # pipelines de IA (tutor, treinador, assistente, provas,
│                                   #   planejamento) + ingestão + repositórios de busca
├── lib/                          # sessao (cookie HMAC), senha (pbkdf2), sessaoServidor (RBAC), utils (cn)
├── supabase/migrations/          # 29 migrations — FONTE DE VERDADE do schema
├── public/                       # manifest.webmanifest, sw.js, ícones SVG
├── docs/                         # este arquivo, Identidade_Visual, Conformidade_Legal
└── local/                        # scripts internos (fora do Git): seeds, testes manuais
```

### 4.1. `app/componentes/` — biblioteca de UI

- **`ui/`** (primitivos "shadcn-style", todos temados pela marca): `Botao`, `Cartao`, `Campo`
  (Entrada/AreaTexto/Selecao/GrupoCampo), `Selo` (badge), `Kpi`, `CabecalhoPagina`,
  `EstadoVazio`, `Icone` (SVG inline, sem dependência).
- **Shell autenticado:** `LayoutApp` (server — monta a nav a partir do registro de módulos +
  módulos habilitados na escola) → `CascaApp` (client — sidebar por papel, topo, logout).
- **Features:** `GestaoMateriais` (upload PDF + audiência), `GestaoTreinos`, `SessaoTreino`
  (coaching do aluno), `AssistenteChat`, `PainelModulos` (toggle de módulos), `BannerConsentimento`
  (LGPD), `BarraImpressao` (folha de prova), `DiagramaEpisteme` + `RespostaRica` (multimodal),
  `RegistrarPWA` + `AtivarNotificacoes` (PWA/push), `Marca`.

### 4.2. `app/api/` — rotas de API (por área)

- **Auth:** `login`, `cadastro`, `auth/sair`.
- **Tutor (aluno):** `tutor` (pergunta→resposta), `tutor/historico`, `tutor/conversa`, `tutor/disciplinas`.
- **Treinador:** `treinos` (CRUD do professor), `treino-sessao` (aluno: orientar/concluir).
- **Provas:** `provas` (aluno responde/feedback/gabarito), `professor/provas`, `professor/correcao`.
- **Assistente da equipe:** `professor/assistente`.
- **Gestor:** `gestor/gestao`, `gestor/disciplinas`, `gestor/configuracoes`, `gestor/relatorios`,
  `gestor/modulos`, `gestor/alunos/{import,export}`.
- **Professor:** `professor/notas`, `professor/plano-ensino`, `professor/export`.
- **Materiais/RAG:** `materiais` (upload incremental + audiência).
- **LGPD/PWA:** `responsavel/consentimento`, `push/inscrever`.

### 4.3. `src/bd/` — acesso ao banco por domínio

`pool.ts` (conexão), `ambiente.ts` (carrega .env em scripts), `cliente.ts` (Supabase JS),
`usuarios.ts`, `aluno.ts`/`alunos.ts`, `professor.ts`, `gestor.ts`, `gestao.ts`, `disciplinas.ts`,
`provas.ts`, `notas.ts`, `configEscola.ts`, `importacao.ts`, `materiais.ts`, `materiaisVersoes.ts`
(versionamento), `modulos.ts`, `relatorios.ts`, `responsavel.ts`, `treinos.ts`, `push.ts`,
`consentimento.ts`. **Regra de ouro:** toda escrita passa pelo pool privilegiado, então
**SEMPRE filtrar por `escola_id`** no `WHERE` (é a proteção real entre escolas — ver §9).

### 4.4. `src/rag/` e `src/ia/` — a camada de IA

- **`ia/`**: `tipos.ts` (interfaces `ProvedorLlm`/`ProvedorEmbeddings`/`RepositorioTrechos`/`FiltroConteudo`),
  `fabricaLlm.ts`/`fabricaEmbeddings.ts` (escolhem provedor por env), provedores
  `provedorOpenAI/Gemini/Ollama/Mock`, `guardrails.ts` (PII, injeção, segurança infantil,
  toxicidade), `texto.ts` (normalização).
- **`rag/`**: `tutor.ts` (pipeline do aluno, busca em camadas + multimodal), `treinador.ts`
  (coach anti-muleta), `assistenteProfessor.ts` (IA da equipe por audiência), `provas.ts`
  (gerar/corrigir prova), `planejamento.ts` (planos de aula). Repositórios de busca:
  `repositorioPostgres.ts` (produção), `repositorioSupabase.ts` (ingestão cloud),
  `repositorioMemoria.ts` (testes), `repositorioConversas.ts` (persistência + auditoria).
  Ingestão: `ingestaoIncremental/` (`hashes.ts` + `pipeline.ts` — versionamento/dedup),
  `extrairPdf.ts`, `chunkerTexto.ts`, `ingestaoLivro.ts`/`ingestaoPdf.ts`/`ingestaoBncc.ts`.

---

## 5. Arquitetura — como as requisições fluem

### 5.1. Pergunta do aluno ao tutor (RAG em camadas + multimodal)

```
Aluno digita (+ opcional foto)  →  POST /api/tutor
  lê cookie de sessão → escola_id, aluno_id; descobre turma/série/disciplina
  guardrailEntrada()  — bloqueia PII, injeção, risco à segurança infantil
  embeddings.gerar(pergunta)  — OpenAI text-embedding-3-small (768d)
  buscar_trechos(escola, vetor, limite, disciplina, ano, turma, papel='aluno', incluir_conteudo=true)
    Busca em CAMADAS (só no chat livre):
      1. LIVRO da escola (turma/disciplina/série)  + docs de AUDIÊNCIA (aluno/escola)
      2. se não achou: habilidade BNCC mais próxima
      3. se não achou: foto enviada (visão do gpt-4o-mini), se houver
      4. senão: conhecimento geral do modelo — SEMPRE avisando a origem
  monta prompt (regras de ANDAIME + fonte + conversa dentro do TTL 7 dias + pergunta + INSTRUCAO_VISUAL)
  llm.gerar()  — gpt-4o-mini, passo a passo em markdown, pode emitir bloco ```viz {json}```
  guardrailSaida()  — revisa antes de devolver
  persiste tudo (sessoes_tutor, interacoes + imagem, interacao_fontes, guardrail_eventos, auditoria)
Resposta → RespostaRica renderiza markdown + desenha os diagramas viz em SVG
```
`modo_estrito` por turma: se ligado e não achar no material da turma, o tutor recusa
(bloqueia o fallback BNCC/geral).

### 5.2. Assistente da equipe (RAG por audiência)

`POST /api/professor/assistente` → `responderAssistente()` chama `buscar_trechos` com
`incluir_conteudo=false` e `papel` = professor|gestor. Assim NÃO usa a base de conteúdo escolar
(disciplina/série) — só documentos cuja **audiência** inclui o papel de quem pergunta ou 'escola'.
Ex.: diretor sobe "regimento" com audiência **escola** → todos veem; sobe orientação com audiência
**professor** → só a IA dos professores retorna aquilo.

### 5.3. Ingestão incremental de material (porte do `rag-ingestao-incremental`)

`POST /api/materiais` (upload de PDF por professor/diretor) → `ingerirPdfIncremental()`:
`hash do arquivo` (idempotência → `duplicada`), cria **versão**, extrai (unpdf) → chunk →
`hash por chunk` (reaproveita embeddings iguais entre versões, ~86% de reuso), publica de
forma **atômica** (nova versão `vigente`, anterior `substituida`), com deleção lógica e janelas
de vigência. A audiência (turma via `materiais_turmas`; papel/escola via `materiais_publico`) é
escolhida no upload (papel/escola só pelo gestor).

---

## 6. Módulos e funcionalidades

O catálogo de funcionalidades é a **fonte de verdade da navegação**: `src/modulos/registro.ts`.
Cada módulo é `{ id, nome, essencial, rotas[] }`; cada rota é amarrada aos papéis que a veem +
`ordem` na barra lateral. `montarNav(papel, habilitados)` deriva a sidebar. Módulos **essenciais**
(visão-geral, tutor, cadastros, segurança, admin, responsável) são sempre ligados; **opcionais**
(assistente, materiais, treinador, provas, planejamento, desempenho, analytics) a escola liga/desliga
em `/gestor/modulos` (estado em `modulos_escola`, deploy-safe).

| Módulo | Onde vive | O que faz |
|---|---|---|
| **Tutor** (essencial) | `app/tutor`, `src/rag/tutor.ts` | Coração: tutor de IA multimodal (andaime) ancorado no material da turma. |
| **Modo Treinador** | `app/treinos`, `app/professor/treinos`, `src/rag/treinador.ts`, `src/bd/treinos.ts` | Dever de casa anti-muleta: IA dá pistas e registra o processo do aluno; professor vê o processo. |
| **Provas** | `app/provas`, `app/professor/provas`, `src/rag/provas.ts` | Elaborar (IA), responder questão a questão (com anti-cópia), corrigir (IA+manual), imprimir PDF. |
| **Assistente da equipe** | `app/professor/assistente`, `src/rag/assistenteProfessor.ts` | IA que responde a professores/gestão a partir dos docs com audiência da equipe. |
| **Materiais** | `app/{gestor,professor}/materiais`, `src/bd/materiais.ts`, `src/rag/ingestaoIncremental` | Upload de PDF (ingestão incremental) + escolha de audiência. |
| **Planejamento** | `app/professor/planos`, `src/rag/planejamento.ts` | Planos de ensino/aula gerados com IA (BNCC + livro + alunos atípicos). |
| **Desempenho** | `app/{professor,gestor}/desempenho`, `src/bd/notas.ts` | Lançar notas/faltas; dashboards de acertos por prova/questão. |
| **Relatórios** | `app/gestor/relatorios`, `src/bd/relatorios.ts` | Filtros turma/disciplina/período + dimensão de **competência BNCC**. |
| **Cadastros** (essencial) | `app/gestor/gestao`, `src/bd/gestao.ts` | CRUD turmas/professores/alunos/vínculos/família; reenturmar; import/export. |
| **Segurança** (essencial) | `app/gestor/logs` | Auditoria + alertas de guardrail de toda a escola. |
| **Responsável** (essencial) | `app/responsavel`, `src/bd/responsavel.ts` | Painel read-only (notas/faltas/atividade) por vínculo de email + consentimento LGPD. |
| **PWA/Push** | `public/`, `src/notificacoes/push.ts`, `app/api/push` | App instalável + notificações (novo treino → avisa a turma). |

---

## 7. Modelo de dados — as 35 tabelas

Convenção: identificadores em português sem acento, `snake_case`; toda tabela de negócio tem
`escola_id` e `criado_em`. Fonte de verdade = `supabase/migrations/`.

- **Núcleo multi-tenant:** `escolas`, `usuarios` (aluno/professor/gestor/admin/responsavel, com
  campos de aluno e de família na mesma linha), `turmas`, `matriculas`, `professores_turmas`,
  `responsaveis`, `configuracoes_escola`.
- **Modularização:** `modulos_escola` (opcionais ligados por escola).
- **Conteúdo e RAG:** `materiais_fonte` (o "livro"), `material_versoes` (versionamento
  incremental), `material_chunks` (trechos vetorizados `vector(768)` + índice ivfflat),
  `materiais_turmas` (audiência por turma), `materiais_publico` (audiência por papel/escola),
  `disciplinas` (catálogo por escola), `competencias_bncc` (habilidades BNCC, 2ª camada de grounding).
- **Tutor:** `sessoes_tutor`, `interacoes` (turnos + telemetria + foto), `interacao_fontes` (rastreabilidade).
- **Modo Treinador:** `treinos`, `treino_sessoes`, `treino_interacoes` (o log do processo).
- **Provas:** `provas`, `questoes` (objetiva/dissertativa), `respostas` (correção IA + manual).
- **Notas/faltas/planejamento:** `notas`, `faltas`, `planos_ensino`, `planos_aula`, `adaptacoes_aula`.
- **Segurança/observabilidade:** `guardrail_eventos`, `auditoria` (append-only), `acessos_professor`.
- **LGPD:** `termos_privacidade` (versionado), `consentimentos`.
- **PWA:** `push_inscricoes`.

---

## 8. Camada de IA — detalhe

- **Fábricas trocáveis por env** (`LLM_PROVEDOR`, `EMBEDDING_PROVEDOR`): padrão **OpenAI**
  (`gpt-4o-mini` + `text-embedding-3-small` 768d) em dev e produção. Gemini e Ollama ficam
  disponíveis; `USAR_MOCK=1` p/ testes sem API.
- **Guardrails** (`src/ia/guardrails.ts`): entrada (PII, prompt injection, segurança infantil,
  toxicidade) e saída (revisão). Toda atuação vira `guardrail_eventos`.
- **RAG em camadas** (tutor livre): livro → BNCC → conhecimento geral, sempre avisando a origem.
  **Provas e geração de questões** são estritamente livro-only (não usam fallback).
- **Audiência** (novo): a mesma `buscar_trechos` recebe `papel` + `incluir_conteudo` e filtra
  documentos por quem pergunta (aluno/professor/gestor/escola) — ver §5.2.
- **Multimodal de saída:** a IA emite `viz {json}` e o app desenha SVG (`DiagramaEpisteme`):
  reta numérica, fração (barra/pizza), agrupamento, barras. **Não** usa geração de imagem por IA.

---

## 9. Segurança, multi-tenant e LGPD

- **Isolamento entre escolas:** RLS ativo no schema (`escola_atual()`/`papel_atual()` leem claims
  de JWT), mas **hoje NÃO é efetivo em runtime** porque o login do piloto usa cookie HMAC próprio,
  não Supabase Auth. Quem impede vazamento na prática é o filtro `where escola_id = $1` em cada
  função de `src/bd/*.ts` — por isso é regra de ouro. **Pendente (planejado): auth híbrida** que
  emite `set local request.jwt.claims` por requisição, tornando o RLS efetivo (defesa em profundidade).
- **Autorização por papel:** cada rota de API valida a sessão e o papel. Audiência de documento
  papel/escola só o gestor define; o assistente do professor não é acessível ao aluno; o
  responsável só vê aluno vinculado por email; professor só mexe no próprio treino/prova.
- **LGPD (modo soft):** termo de privacidade versionado (`/privacidade`), consentimento parental
  registrado no painel do responsável (`consentimentos`) — hoje registra, não bloqueia (gate
  obrigatório fica pós-campanha com alunos já ativos em produção).
- **Segredos:** chaves (OpenAI, VAPID, `SESSION_SECRET`, `DATABASE_URL`) em `.env.local` (dev,
  git-ignored) / Vercel (prod). **Rotacionar as credenciais de teste antes de dados reais**;
  a chave OpenAI hoje é pessoal do João (migrar p/ conta do projeto).

---

## 10. Rodar localmente, migrations e deploy

```powershell
# pré-requisito: Docker Desktop aberto
supabase start                 # sobe o Supabase local (Docker)
supabase migration up          # aplica migrations pendentes no banco LOCAL
# .env.local precisa de: DATABASE_URL (local, 127.0.0.1:54322), NEXT_PUBLIC_SUPABASE_URL,
#   EMBEDDING_PROVEDOR=openai, LLM_PROVEDOR=openai, OPENAI_API_KEY, SESSION_SECRET,
#   NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
npm run dev                    # http://localhost:3000  (rode UMA instância só)
```

Comandos: `npm run typecheck` · `npm run build` (o mesmo que a Vercel roda) · `npm run start`
(serve o build — bem mais rápido que `dev` p/ testar) · `npm run demo:rag`.

**Deploy:** `git push` na `main` → Vercel builda e publica. Migrations no cloud: `supabase db push`
(a `DATABASE_URL` de prod é o **pooler** `...pooler.supabase.com`, não a conexão direta IPv6).

**Gotchas críticos:**
- **Nunca rode `npm run dev` e `npm run build` ao mesmo tempo** — corrompem `.next`
  (`routes-manifest.json` ENOENT). Se acontecer: parar tudo, `rm -rf .next`, subir limpo.
- **`npm install` com o dev ativo trava arquivos** (`next-swc`) — pare o dev antes.
- **`src/bd/pool.ts` lê `DATABASE_URL` no import** — em scripts `tsx`, setar a env no shell antes.
- **Editar migration já aplicada não a reexecuta** — criar migration nova (`create or replace`)
  e corrigir a original só p/ refletir o estado (documentação).

---

## 11. Débito técnico e pendências conhecidas

1. **Auth híbrida / RLS efetivo em runtime** — a maior peça de segurança pendente (§9).
2. **LGPD gate obrigatório** — hoje é soft; virar bloqueante após campanha de consentimento.
3. **Rotacionar credenciais de teste** e migrar a chave OpenAI p/ conta do projeto.
4. **Editar audiência de doc existente na UI** (hoje só no upload).
5. **Push também em prova publicada / feedback pronto** (hoje só treino publicado).
6. **Ícones PWA em PNG 192/512** (hoje SVG — melhora compat de instalação).
7. **BNCC de Português/História é um conjunto curado** — conferir/completar contra a BNCC oficial.
8. **`interacoes.anexo_imagem` guarda base64 na coluna** — se o uso de fotos crescer, migrar p/ Supabase Storage.
9. **Sem testes automatizados formais** (só scripts manuais em `local/`).

---

## 12. Convenções

- **Identificadores em português sem acento** (variáveis, funções, arquivos); case idiomático por
  linguagem (camelCase TS, snake_case SQL, PascalCase componentes); palavras-chave SQL em inglês.
  Comentários em português.
- **Toda mudança:** `npm run typecheck` + `npm run build` antes de considerar pronto; manter a
  identidade visual e os componentes de `app/componentes/ui`; commits pequenos e descritivos.
- **Antes de mexer no schema:** ler as migrations existentes em `supabase/migrations`.
