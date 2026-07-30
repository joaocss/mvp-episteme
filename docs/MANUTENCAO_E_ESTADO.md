# Episteme — Mapeamento Completo do Projeto

*Documento vivo. Última atualização: 30/07/2026 (Fase 7).*

Este documento existe para uma pessoa nova (humana ou IA) conseguir entender o projeto
inteiro sem precisar ler todo o código: o que é, por que cada peça foi escolhida, onde
cada coisa está, o estado real do banco, e o que falta fazer.

---

## 1. O que é o Episteme

SaaS educacional **multi-tenant** (uma aplicação atende várias escolas, dados isolados
por `escola_id`). O núcleo é um **tutor de IA** que responde dúvidas do aluno ancorado
no material didático da própria escola e na BNCC — filosofia central: a IA é uma
**parceira cognitiva**, não uma muleta. Ela conduz o raciocínio passo a passo em vez de
entregar a resposta pronta, para combater a "descarga cognitiva" (o aluno para de pensar
porque a IA pensa por ele).

Hoje o sistema cobre, para as turmas cadastradas: tutor de IA (Matemática 6º ano,
Português 6º ano, História 7º ano), provas com correção assistida por IA e manual,
notas e faltas, planejamento de aula, e três painéis (aluno, professor, gestor).

### Papéis

| Papel | O que vê e faz |
|---|---|
| **Aluno** | Tutor de IA (por disciplina), provas, histórico, feedback |
| **Professor** | Turmas que leciona: conversas dos alunos, alertas, provas (elaborar/corrigir), notas/faltas, planejamento de aula |
| **Gestor** | Toda a escola: dashboard, cadastro (turmas/professores/alunos/vínculos), desempenho, logs/auditoria, configurações da escola |
| **Responsável** | Planejado, ainda não implementado (aparece como "em breve" na tela de escolha de perfil) |

---

## 2. Onde tudo está (URLs e acessos)

| O quê | Onde |
|---|---|
| **App em produção** (para outras pessoas testarem, sem precisar rodar nada local) | **https://mvp-episteme-nu8r.vercel.app** |
| Repositório (código-fonte) | `github.com/joaocss/mvp-episteme` — a raiz do repo Git é a pasta `codigo/` deste projeto |
| Hospedagem do app | Vercel (deploy automático a cada `git push` na branch `main`) |
| Banco de dados | Supabase Cloud, projeto `gkycodihvnnrfldibywy`, região `us-east-1` |
| Painel do Supabase (tabelas, SQL editor, logs) | `supabase.com/dashboard/project/gkycodihvnnrfldibywy` |
| Painel da Vercel (variáveis de ambiente, deploys, logs) | `vercel.com` → projeto do time do João |

### Login de teste (produção e local, senha `episteme123` para todos)

| Papel | Email |
|---|---|
| Gestor | `gestor@episteme.teste` |
| Professor | `professor@episteme.teste` |
| Aluno (6º ano — Matemática/Português) | `joaosena.cosme@gmail.com` |
| Aluno (7º ano — História) | `pedro7ano@episteme.teste` |

A tela inicial de acesso é `/paineis` — escolha do perfil **antes** de logar; depois de
autenticado, o usuário cai direto no próprio painel (não vê os outros módulos).

---

## 3. Stack tecnológica — e por que cada escolha

| Camada | Tecnologia | Por quê |
|---|---|---|
| Linguagem | TypeScript | Tipagem estática pega erros de integração (nome de coluna errado, contrato de API quebrado) em tempo de build, essencial num projeto com muitas camadas (BD → RAG → API → UI) mantido por IA e humano junto. |
| Frontend + backend | **Next.js 15 (App Router)** + React 19 | Um único framework serve páginas *e* rotas de API (`app/api/*`), sem precisar de um backend separado. App Router com Server Components deixa a maioria das páginas buscarem dados direto no banco no servidor (sem uma camada REST intermediária redundante). Deploy nativo e gratuito (tier Hobby) na Vercel, que é a mesma empresa por trás do Next.js — fricção mínima. |
| Estilo | Tailwind CSS 3 + tokens de marca (`tailwind.config.ts`) | Consistência visual rápida sem escrever CSS solto; os tokens (roxo `#3B2C63`, dourado, creme) centralizam a identidade do Episteme num só lugar. |
| Banco de dados | **PostgreSQL** (via Supabase) | Relacional de verdade — o domínio (escola → turma → aluno → prova → questão → resposta) é fortemente relacional, com muitas chaves estrangeiras. JSONB cobre os campos flexíveis (planos de aula, alternativas de questão) sem precisar de um banco de documentos à parte. |
| Extensão vetorial | **pgvector** | Permite guardar os embeddings do material didático *na mesma* tabela relacional e fazer a busca por similaridade com SQL comum (`buscar_trechos`), em vez de manter um banco vetorial separado (Pinecone, Weaviate) — menos peças móveis, e o RLS do Postgres protege os vetores como protege qualquer outra linha. |
| Provedor do banco | **Supabase** | Postgres gerenciado + pgvector pronto de fábrica + Auth/Storage disponíveis se forem precisos depois, tudo num free tier generoso o suficiente pra um piloto. |
| Acesso ao banco pelo app | **node-postgres (`pg`)**, pool direto (`src/bd/pool.ts`) | O app conecta direto via SQL (não via REST do PostgREST) porque a maior parte das consultas é relacional/complexa (joins, agregações para dashboards) — SQL puro é mais direto que montar isso em cima de uma API REST genérica. |
| Row Level Security | RLS do Postgres (`escola_atual()`, `papel_atual()`) | Isolamento entre escolas garantido **no banco**, não só na aplicação — mesmo que um bug na aplicação esqueça um filtro, o banco não devolve dado de outra escola. (Nota: hoje as escritas do app usam o pool privilegiado, que baixa por trás do RLS — ver seção 9, item de segurança.) |
| IA — geração de texto | **OpenAI `gpt-4o-mini`** | Modelo barato e rápido o suficiente para um tutor conversacional em produção; suporta **visão** (`image_url`), usado no upload de foto do aluno. |
| IA — embeddings | **OpenAI `text-embedding-3-small`**, pedindo `dimensions: 768` | Mesmo provedor da geração simplifica a conta/chave; 768 dimensões (em vez do padrão 1536) reduz custo de armazenamento e velocidade de busca sem perda perceptível de qualidade para textos didáticos. |
| Abstração de IA | Fábrica de provedores (`src/ia/fabricaLlm.ts`, `fabricaEmbeddings.ts`) | Troca de provedor (Gemini, Ollama local, mock para testes) só mudando uma variável de ambiente — o pipeline do tutor (`src/rag/tutor.ts`) não sabe nem se importa qual provedor está por trás. Gemini foi o provedor original do projeto (início), hoje só fica disponível como opção, não em uso. |
| Autenticação | Cookie assinado HMAC (`lib/sessao.ts`) + senha com **pbkdf2** (`lib/senha.ts`) | Solução deliberadamente simples para o piloto — sem depender do Supabase Auth (que exigiria mais integração) enquanto o número de usuários é pequeno e controlado. **Ponto de atenção**: precisa endurecer antes de dados reais (ver seção 9). |
| Renderização de markdown | `react-markdown` | As respostas da IA agora pedem formatação passo a passo (negrito, listas numeradas); sem isso o aluno veria `**texto**` literal em vez de negrito. |
| Gráficos | `recharts` | Dashboards do gestor (perguntas por dia, notas por turma, evasão). |
| Scripts administrativos | `tsx` (roda TypeScript direto, sem build) | Ingestão de livros, criação de escola, etc. rodam como scripts de linha de comando sem precisar compilar. |

---

## 4. Arquitetura — como uma pergunta do aluno vira resposta

```
Aluno digita a pergunta (+ opcionalmente uma foto)
        │
        ▼
POST /api/tutor  (app/api/tutor/route.ts)
        │  lê o cookie de sessão → escola_id, aluno_id
        │  descobre a série do aluno (turma) e a disciplina da sessão
        ▼
guardrailEntrada()          — bloqueia PII, prompt injection, risco à segurança infantil
        ▼
embeddings.gerar(pergunta)  — OpenAI text-embedding-3-small (768d)
        ▼
Busca em CAMADAS (só no chat livre; gerar questão de treino é sempre livro-only):
  1. LIVRO da escola, filtrado por disciplina + série  (buscar_trechos)
  2. Se não achou:  habilidade da BNCC mais próxima, mesmo filtro (buscar_bncc_similar)
  3. Se não achou:  foto enviada pelo aluno (visão do gpt-4o-mini), se houver
  4. Se não achou nada:  conhecimento geral do modelo — SEMPRE avisando a origem
        ▼
Monta o prompt (regras + fonte + conversa anterior dentro do TTL de 7 dias + pergunta)
        ▼
llm.gerar()  — gpt-4o-mini, passo a passo em markdown
        ▼
guardrailSaida()  — revisa a resposta antes de devolver
        ▼
Persiste tudo: sessoes_tutor, interacoes (+ imagem anexada), interacao_fontes,
               guardrail_eventos, auditoria — todos com trace_id em comum
        ▼
Resposta ao aluno, com selo da origem (📘 BNCC / 🌐 conhecimento geral / 📷 imagem)
```

**Multi-tenant:** toda tabela de negócio tem `escola_id`; toda consulta filtra por ele.
RLS no banco reforça isso na leitura; as escritas do app usam um pool com privilégio
mas o código sempre inclui `where escola_id = $1` (ver `src/bd/*.ts`).

**Multi-série/multi-disciplina (Fase 7):** antes o sistema assumia sempre "Matemática do
6º ano". Hoje `materiais_fonte` e `competencias_bncc` têm `disciplina` + `ano`, e a busca
filtra por eles. O aluno da 7ª série só enxerga o que é da 7ª série; se a escola tiver
mais de uma disciplina disponível para a série dele, um seletor aparece no chat.

---

## 5. Mapa de pastas — onde encontrar cada coisa

```
codigo/                        # raiz do repositório Git
├── app/                        # Next.js App Router
│   ├── page.tsx                 # landing pública
│   ├── paineis/                 # escolha de perfil (pública, pré-login)
│   ├── login/                   # login único (aceita ?papel= para contexto visual)
│   ├── auth/sair/                # logout
│   ├── tutor/                   # chat do aluno (texto + foto + seletor de disciplina)
│   ├── provas/[id]/             # aluno respondendo prova, questão por questão
│   ├── professor/
│   │   ├── page.tsx               # painel: KPIs, sessões, alertas, competências
│   │   ├── desempenho/            # lançar notas/faltas, ver acertos por prova
│   │   ├── planos/                # planejamento de aula com IA
│   │   ├── provas/                # listar, elaborar (IA), corrigir manualmente
│   │   └── sessao/[id]/           # ver a conversa de um aluno específico
│   ├── gestor/
│   │   ├── page.tsx               # dashboard macro (KPIs + gráficos)
│   │   ├── gestao/                # CRUD turmas/professores/alunos/vínculos/família
│   │   ├── desempenho/            # notas/acertos de toda a escola
│   │   ├── logs/                  # auditoria + alertas de guardrail
│   │   └── configuracoes/         # nome, logo, escala de nota da escola
│   ├── dashboard/{aluno,professor,gestor}/  # redirecionam pro destino real (RBAC)
│   ├── componentes/               # Marca (logo), ui/ (Botao, Cartao — shadcn-style)
│   └── api/                       # rotas de API (login, cadastro, tutor/*, provas,
│                                   #   professor/*, gestor/*)
├── src/
│   ├── ia/                      # fábricas de provedor (OpenAI/Gemini/Ollama/mock),
│   │                             #   guardrails, tipos das interfaces de IA
│   ├── rag/                     # pipeline do tutor (tutor.ts), provas (provas.ts),
│   │                             #   planejamento, ingestão de livro/BNCC, chunker,
│   │                             #   repositórios de busca vetorial (Postgres/Supabase/memória)
│   └── bd/                      # acesso ao Postgres por domínio: pool.ts (conexão),
│                                 #   aluno.ts, professor.ts, gestor.ts, gestao.ts,
│                                 #   provas.ts, notas.ts, configEscola.ts, alunos.ts
├── lib/                         # sessao.ts (cookie HMAC), senha.ts (pbkdf2), utils.ts
├── supabase/
│   ├── migrations/               # TODAS as mudanças de schema, em ordem — fonte da verdade
│   └── seed.sql                  # dados de demonstração (só usado localmente)
├── docs/                        # este arquivo, Identidade_Visual.md, Conformidade_Legal.md
├── local/                       # scripts internos (fora do Git): criar_escola.ts, testes manuais
└── public/                      # logo-episteme.svg, icone-episteme.svg
```

---

## 6. Banco de dados — schema real (24 tabelas)

Convenção: identificadores em português sem acento, `snake_case`; toda tabela de negócio
tem `escola_id` (isolamento multi-tenant) e `criado_em`. Contagens abaixo são do banco
**local** de desenvolvimento (o schema é idêntico ao de produção; os *dados* de produção
são diferentes — produção só tem o material de Matemática ingerido até a Fase 7 concluir
a ingestão em nuvem, ver seção 10).

### 6.1 Núcleo multi-tenant

| Tabela | Linhas (local) | Campos principais | Para quê |
|---|---|---|---|
| `escolas` | 1 | `nome`, `cnpj`, `status` | Raiz do tenant. Uma linha por escola cliente. |
| `usuarios` | 10 | `escola_id`, `papel` (enum), `nome`, `email`, `senha_hash`, `data_nascimento`, `disciplinas`, `atipicidades`/`adaptacoes` (jsonb), `endereco_familia`, `estado_civil_pais`, `pais_moram_juntos` | Toda pessoa do sistema (aluno/professor/gestor/admin), com campos extras de aluno direto na mesma tabela (convenção do projeto). |
| `turmas` | 5 | `nome`, `serie`, `ano_letivo` | Ex.: "6º A" / série "6o ano". |
| `matriculas` | 5 | `aluno_id`, `turma_id` | Vínculo aluno↔turma. |
| `professores_turmas` | 5 | `professor_id`, `turma_id`, `disciplina` | Vínculo professor↔turma↔**disciplina** (um professor pode lecionar mais de uma disciplina/turma). |
| `responsaveis` | 0 | `aluno_id`, `nome`, `parentesco`, `telefone`, `email` | 1:N — vários responsáveis por aluno. |

Enum `papel_usuario`: `admin`, `professor`, `aluno`, `responsavel`, `gestor`.

### 6.2 Personalização por escola

| Tabela | Linhas | Campos | Para quê |
|---|---|---|---|
| `configuracoes_escola` | 1 | `escola_id` (PK), `logo_url`, `nota_maxima`, `nota_minima_aprovacao` | Uma linha por escola — já pronta para várias escolas, só falta ter mais de uma em uso. |

### 6.3 Conteúdo e RAG

| Tabela | Linhas | Campos | Para quê |
|---|---|---|---|
| `materiais_fonte` | 3 | `disciplina`, `ano`, `titulo`, `tipo`, `status_ingestao` | Um registro por livro/apostila ingerida. Hoje: Matemática 6º, Português 6º, História 7º. |
| `material_chunks` | 2975 | `material_id`, `ordem`, `texto`, `metadados` (jsonb), `embedding vector(768)` | Pedaços do livro (~900 caracteres, com sobreposição) já vetorizados. Índice `ivfflat` para busca por similaridade. |
| `competencias_bncc` | 34 | `codigo` (ex. EF06MA07), `disciplina`, `ano`, `unidade_tematica`, `descricao`, `embedding vector(768)` | Catálogo de habilidades da BNCC, usado como 2ª camada de grounding. |

Funções SQL de busca (vivem nas migrations, não em tabelas): `buscar_trechos(escola, vetor,
limite, disciplina?, ano?)`, `buscar_bncc(vetor, disciplina?, ano?)`, `buscar_bncc_similar(vetor,
limite, disciplina?, ano?)`.

### 6.4 Tutor (conversas)

| Tabela | Linhas | Campos | Para quê |
|---|---|---|---|
| `sessoes_tutor` | 5 | `aluno_id`, `disciplina`, `iniciada_em`, `encerrada_em` | Uma conversa. Disciplina fixada na criação. |
| `interacoes` | 16 | `sessao_id`, `autor` (aluno/ia), `conteudo`, `modelo`, `tokens_entrada/saida`, `latencia_ms`, `competencia_bncc`, `trace_id`, `anexo_imagem` | Cada turno da conversa, com telemetria completa. `anexo_imagem` guarda a foto (base64) que o aluno mandou. |
| `interacao_fontes` | 6 | `interacao_id`, `chunk_id`, `score` | Rastreabilidade: quais trechos do livro embasaram a resposta. |

### 6.5 Segurança e observabilidade

| Tabela | Linhas | Campos | Para quê |
|---|---|---|---|
| `guardrail_eventos` | 0 | `categoria` (pii/off_topic/seguranca_infantil/injection/toxicidade), `acao`, `severidade`, `detalhe`, `trace_id` | Toda vez que um guardrail age. Visível para professor (sua turma) e gestor (escola toda). |
| `auditoria` | 9 | `ator_id`, `acao`, `entidade`, `entidade_id`, `trace_id` | Trilha append-only de operações sensíveis. Visível para gestor/admin. |

### 6.6 Provas

| Tabela | Linhas | Campos | Para quê |
|---|---|---|---|
| `provas` | 0 | `turma_id`, `professor_id`, `disciplina`, `titulo`, `assunto`, `numero_questoes`, `status` (enum) | Uma avaliação. |
| `questoes` | 0 | `prova_id`, `ordem`, `tipo` (enum objetiva/dissertativa), `enunciado`, `alternativas` (jsonb), `gabarito`, `explicacao` | Questões geradas por IA (ancoradas no livro) e editáveis pelo professor. |
| `respostas` | 0 | `questao_id`, `aluno_id`, `resposta_aluno`, `correta`, `nota`, `feedback_ia`, `nota_manual`, `feedback_professor`, `corrigido_por`, `nota_efetiva` (coluna gerada = `coalesce(nota_manual, nota)`) | Resposta do aluno + correção automática/IA + possível sobrescrita manual do professor. |

Enums: `status_prova` (`rascunho`/`publicada`/`encerrada`), `tipo_questao` (`objetiva`/`dissertativa`).

*(Contagem zerada localmente porque os testes de prova nesta sessão foram limpos depois
de verificados — o fluxo foi testado e funciona, ver Fase 3 e 5 no changelog.)*

### 6.7 Notas e faltas (lançamento manual)

| Tabela | Linhas | Campos | Para quê |
|---|---|---|---|
| `notas` | 0 | `aluno_id`, `turma_id`, `professor_id`, `prova_id?`, `disciplina`, `descricao`, `valor`, `nota_maxima`, `data_lancamento` | Notas avulsas (trabalho, participação) — independente do módulo de Provas. |
| `faltas` | 0 | `aluno_id`, `turma_id`, `professor_id`, `data_falta`, `situacao` (enum), `motivo` | Situação: `justificada` / `nao_justificada`. |

### 6.8 Planejamento de aula

| Tabela | Linhas | Campos | Para quê |
|---|---|---|---|
| `planos_ensino` | 0 | `professor_id`, `disciplina`, `turma`, `ano_letivo`, `conteudo` (jsonb), `versao`, `ativo` | Plano de ensino gerado com IA, considerando BNCC + livro + alunos atípicos. |
| `planos_aula` | 0 | `plano_ensino_id?`, `topico`, `data_aula`, `duracao_min`, `conteudo` (jsonb), `template`, `pai_id` (auto-referência) | Aulas individuais dentro de um plano. |
| `adaptacoes_aula` | 0 | `plano_aula_id?`, `aluno_id?`, `tipo`, `descricao`, `estrategias` (jsonb) | Adaptações para alunos com atipicidades. |

### 6.9 Métricas de uso

| Tabela | Linhas | Para quê |
|---|---|---|
| `acessos_professor` | 12 | Registro simples de acesso ao painel do professor (usado no KPI "Sessões" do gestor, indiretamente). |

### 6.10 Row Level Security

RLS ativo em todas as tabelas de negócio. Padrão: `for select using (escola_id = escola_atual())`,
onde `escola_atual()`/`papel_atual()` leem claims de um JWT — **hoje não totalmente efetivo em
runtime**, porque o login do piloto usa cookie HMAC próprio, não Supabase Auth (ver seção 9,
gap de segurança #1). RLS está pronto e correto no schema, mas quem hoje impede vazamento
entre escolas na prática é o filtro `where escola_id = $1` em cada função de `src/bd/*.ts`.

---

## 7. O que já existe — histórico por fase

| Fase | Entregue |
|---|---|
| **0 — Piloto** | Login por senha, RAG com grounding e recusa fora de escopo, guardrails (PII/injeção/segurança infantil), questões de treino, identidade visual. |
| **1 — Painéis** | `/paineis`, rotas `/dashboard/{papel}`, RBAC por middleware, base de componentes UI. |
| **2 — Gestor** | CRUD completo (turmas/professores/alunos), tabelas filtráveis com edição inline, gráficos (Recharts). |
| **3 — Provas** | Elaborar prova com IA (ancorada no RAG), revisão/edição pelo professor, aluno responde questão a questão, feedback/gabarito, gráficos de notas/aprovação/evasão. |
| **4 — Memória de contexto** | Conversa mantém contexto entre perguntas (TTL de 7 dias); sessão "fria" some do contexto mas continua visível no histórico. |
| **5 — Cadastro estendido, notas, correção manual, dashboards, config** | Responsáveis, endereço/estado civil dos pais; notas/faltas manuais; correção manual de prova pelo professor; dashboard de desempenho (professor e gestor); configurações da escola (logo, nota); gestor com acesso a logs/auditoria de toda a escola; script de provisionamento de nova escola. |
| **6 — Tutor em camadas, multimodal** | Busca em 3 níveis (livro → BNCC → conhecimento geral, sempre avisando a origem); feedback passo a passo em markdown; aluno pode continuar perguntando sobre uma questão de prova; upload de foto no chat (visão do gpt-4o-mini). |
| **7 — Multi-série/disciplina, login por módulo** | Filtro de busca por disciplina+série; Português 6º e História 7º ingeridos (local **e produção**); seletor de disciplina no chat; `/paineis` público como escolha de perfil pré-login; correção do bug de imagem não persistida; nome da escola editável. |

---

## 8. Rodar localmente

```powershell
supabase start
supabase db reset          # aplica todas as migrations + seed.sql
# .env.local precisa ter: DATABASE_URL (local), NEXT_PUBLIC_SUPABASE_URL,
#   EMBEDDING_PROVEDOR=openai, LLM_PROVEDOR=openai, OPENAI_API_KEY, SESSION_SECRET
npx tsx src/rag/ingestaoBncc.ts
npx tsx src/rag/ingestaoLivro.ts superacao.txt 00000000-0000-0000-0000-000000000001 00000000-0000-0000-0000-000000000010
npm install
npm run dev
```

Comandos úteis: `npm run typecheck` (tsc --noEmit), `npm run build` (o mesmo que a Vercel
roda), `npm run demo:rag` (exercita o pipeline sem UI).

---

## 9. Débito técnico e pontos de atenção conhecidos

1. **Autenticação de piloto, não de produção.** Cookie HMAC + pbkdf2 funciona, mas não
   tem recuperação de senha, 2FA, nem integra com o RLS via JWT real. Antes de dados
   reais de aluno: migrar para Supabase Auth (ou equivalente) e então o RLS passa a
   proteger de verdade em runtime, não só como defesa em profundidade teórica.
2. **LGPD**: consentimento parental (art. 14) e minimização de dados — decisão consciente
   do João de adiar, mas é bloqueante antes de qualquer aluno real usar o sistema com
   dados verdadeiros.
3. **Credenciais de teste** (senha do banco, chave OpenAI pessoal, senha `episteme123`)
   precisam ser rotacionadas antes de produção real. A chave OpenAI hoje é pessoal do
   João — migrar para uma conta do projeto.
4. **`interacoes.anexo_imagem` guarda a imagem em base64 direto na coluna `text`.**
   Funciona, mas não escala bem (linhas grandes no Postgres). Se o uso de fotos crescer,
   trocar por um bucket do Supabase Storage e guardar só a URL.
5. **`configuracoes_escola.logo_url` é uma URL simples** (sem upload/storage próprio) —
   suficiente para o piloto; um upload de arquivo direto exigiria Supabase Storage.
6. **BNCC só tem 34 habilidades cadastradas**, todas de Matemática 6º ano — a 2ª camada
   de grounding (livro → BNCC → geral) não tem o que achar para Português/História ainda,
   então essas disciplinas caem direto para "conhecimento geral" quando o livro não cobre
   o assunto. Não é um bug, é uma lacuna de dado (precisaria popular BNCC das outras
   disciplinas/séries).
7. **Auto-cadastro de aluno sempre matricula na turma fixa `TURMA_6ANO`** (`src/bd/alunos.ts`).
   Não é usado no fluxo principal (a maioria dos alunos é cadastrada pelo gestor), mas é
   uma pendência se o auto-cadastro público for usado com turmas variadas.
8. **Criação de nova escola é só via script interno** (`local/criar_escola.ts`), não uma
   tela. Decisão deliberada (ver Fase 5) — evita construir um fluxo público de billing/
   segurança antes de precisar.
9. **Sem testes automatizados formais** (só scripts manuais em `local/test_*.ts`, fora do
   Git). Funciona para o ritmo atual, mas cresce o risco de regressão conforme o projeto
   cresce.
10. **`src/bd/pool.ts` lê `DATABASE_URL` no momento do `import`**, antes de qualquer
    `carregarEnvLocal()` — scripts standalone precisam setar a variável de ambiente no
    shell *antes* de rodar (`$env:DATABASE_URL=...`), não dentro do próprio script.

---

## 10. Ingestão em produção — concluída (30/07/2026)

O material de **Português 6º ano** (1341 trechos) e **História 7º ano** (1634 trechos)
foi ingerido em produção via a API REST do Supabase (`@supabase/supabase-js` com a
`service_role` key, mesmo padrão de `src/rag/repositorioSupabase.ts`) — caminho usado
porque as variáveis de ambiente da Vercel estão marcadas como **sensitive** (write-only:
nem a API nem o painel devolvem o valor depois de salvo), então a `DATABASE_URL` do
pooler não pôde ser lida de lá. Script pontual descartado depois de rodar (não fica no
repositório). `materiais_fonte` em produção agora tem as 3 disciplinas: matemática (6º),
português (6º) e história (7º).

Também vinculado, em produção: o professor que já lecionava Português na turma do 7º ano
passou a lecionar História nela também (a turma de 7º já existia em produção, criada
pelo próprio time — **note**: produção já tinha uso orgânico real acontecendo (vários
alunos com nomes/emails reais, além dos usuários de teste do seed), não é só um espelho
do ambiente local. Qualquer ação em produção daqui pra frente deve levar isso em conta.

### Como refazer a ingestão de um material novo em produção

Sem a `DATABASE_URL` (bloqueada como sensitive), usar a API REST do Supabase:

```ts
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
// 1. insert em materiais_fonte (disciplina, ano, titulo) -> pega o id
// 2. chunkarTexto() do texto do livro (src/rag/chunkerTexto.ts)
// 3. embeddings.gerarLote() em lotes de 100
// 4. supabase.from("material_chunks").insert([...]) com embedding como "[1,2,3]" (string)
```

Isso reflete `src/rag/repositorioSupabase.ts`, o caminho que o próprio `ingestaoLivro.ts`
já usa quando `DATABASE_URL` não está definida.

---

## 11. Roadmap — o que vem depois, em ordem sugerida

Critério de ordenação: bloqueantes de segurança/dados reais primeiro, depois o que tem
maior impacto de uso com menor esforço, depois o resto.

### Curto prazo (próximas sessões)
1. **Popular BNCC de Português e História** — hoje só Matemática tem habilidades
   cadastradas; sem isso a 2ª camada de grounding não funciona para as novas disciplinas.
2. **Modo treinador (tarefa de casa anti-muleta)** — pedido explícito do João e já
   desenhado por outra IA numa sessão anterior: a IA dá pistas e registra o processo do
   aluno, sem entregar a resposta. Justificativa: é a extensão natural da filosofia
   "parceira cognitiva" para o dever de casa, onde hoje não há registro de processo.
3. **Exportação de prova em PDF** (`@react-pdf/renderer`, já cogitado) — professores
   frequentemente precisam imprimir provas para aplicação presencial; hoje só existe a
   versão digital.

### Médio prazo
5. **Auth real (Supabase Auth) + LGPD** — pré-requisito conjunto e bloqueante antes de
   qualquer dado de aluno real (não-teste). Justificativa: risco legal e de confiança dos
   pais é o maior risco do projeto hoje.
6. **Testes automatizados** (vitest, cobrindo pelo menos os pipelines de RAG e provas) —
   à medida que o projeto cresce, o custo de regressão manual sobe; vale investir assim
   que a auth real entrar (mudança grande o suficiente pra justificar a rede de segurança).
7. **Imagens *nas respostas* da IA** (diferente do upload — aqui é a IA gerando um
   diagrama/gráfico simples, ex. reta numérica, gráfico de fração). Хoje só existe
   entrada multimodal (aluno manda foto), não saída.
8. **Cronograma / grade de horários** — módulo do roadmap original ainda não iniciado.

### Longo prazo
9. **Self-service de cadastro de escola** — hoje é só via script interno; uma tela
   pública exigiria pensar em billing/verificação/abuso antes de valer a pena.
10. **Storage de imagem dedicado** (Supabase Storage) em vez de base64 na coluna —
    só vale a pena se o uso de fotos no tutor crescer de fato.
11. **Painel do Responsável** — hoje é só um card "em breve" na tela de escolha de perfil.
12. **Migrar chave OpenAI para conta do projeto** (hoje é pessoal do João) — trivial, mas
    fica mais urgente conforme o uso cresce e a chave pessoal vira gargalo de billing.

---

## 12. Lições aprendidas (evitar retrabalho)

- **Sempre `git push` antes do deploy** — a Vercel builda a partir do GitHub, não da máquina local.
- **Conexão direta do Supabase (`db.<ref>.supabase.co`) é IPv6** e não resolve em rede
  IPv4 comum → sempre usar o **pooler** (`...pooler.supabase.com`): Transaction (6543)
  para o app serverless, Session (5432) para scripts/ingestão.
- **Editar uma migration já aplicada não a reexecuta.** Correções em produção depois do
  fato precisam ser SQL direto (`alter table ...`), e a migration original deve ser
  atualizada só para refletir o estado real (documentação), não para "consertar" o passado.
- **Senha do banco com `@`** vira `%40` na connection string.
- **`pool.ts` lê `DATABASE_URL` no import** — setar a variável no shell *antes* de rodar
  qualquer script de ingestão/administração, nunca dentro do próprio script.
- **`create table if not exists` não altera coluna existente** — se o tipo de uma coluna
  mudar (ex. dimensão do vetor), precisa de `alter table ... alter column` explícito.
- **`npm run dev` e `npm run build` não devem rodar ao mesmo tempo** na mesma pasta —
  os dois escrevem em `.next/` com formatos incompatíveis e geram erros `ENOENT`
  confusos. Se acontecer, parar tudo, `rm -rf .next` e subir de novo limpo.
