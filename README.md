# mvp-episteme — Módulo 1 (Tutor de IA · 6º ano · Matemática)

Fundação do primeiro módulo: base de dados multi-tenant, políticas de segurança
(RLS), busca vetorial e o protótipo do pipeline de RAG.

## Estrutura

```
codigo/
├── supabase/
│   └── migrations/                         # FONTE DE VERDADE (aplicada pelo CLI)
│       ├── 20260728000100_extensoes.sql        # pgcrypto + vector (pgvector)
│       ├── 20260728000200_schema.sql           # tabelas do módulo (escola_id em tudo)
│       ├── 20260728000300_rls.sql              # RLS: isolamento + gating de 6º ano
│       └── 20260728000400_busca_vetorial.sql   # função buscar_trechos() no pgvector
├── rag/
│   ├── exemplo/conteudo_6ano_mat.md        # material de exemplo (trocar pelo livro real)
│   ├── poc_rag.py                          # PoC: ingestão → busca → grounding → prompt
│   └── avaliacao.py                        # harness que mede a qualidade da recuperação
├── bd/                                     # (obsoleto — ponteiros para supabase/migrations)
├── .env.example                           # modelo de variáveis (copie para .env)
└── .gitignore
```

## 1. Rodar o protótipo do RAG (não precisa de nada externo)

```bash
cd rag
python3 poc_rag.py     # demonstra o fluxo com perguntas de exemplo
python3 avaliacao.py   # taxa de acerto da recuperação (top-1)
```

O `vetorizar()` do PoC é um substituto (saco de palavras) só para provar a mecânica.
Em produção ele é trocado pela chamada ao provedor de embeddings, e a busca passa
a rodar no pgvector via `buscar_trechos()`.

## 2. Aplicar o banco no Supabase (CLI)

Requer o Supabase CLI instalado e o projeto já criado.

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push          # aplica todas as migrations em ordem
```

A extensão `vector` é criada pela primeira migration, então não precisa habilitar à mão.

### Alternativa via psql (sem o CLI)

```bash
# defina DATABASE_URL no seu shell (não commite a senha!)
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

## 3. Variáveis de ambiente

```bash
cp .env.example .env      # preencha com as suas chaves; .env está no .gitignore
```

A `service_role` e as chaves de IA são secretas e só existem no backend — nunca
vão para o frontend nem para o repositório.

## 4. Subir para o GitHub

```bash
git remote add origin https://github.com/joaocss/mvp-episteme.git
git push -u origin main
```

## Protótipo × produção

| Peça | Estado | Vira produção quando |
|---|---|---|
| Schema + RLS + índices | Pronto para aplicar | Rodar no Supabase e o amigo de banco auditar as políticas |
| Função de busca vetorial | Pronta (pgvector) | Houver embeddings reais na coluna `embedding` |
| `vetorizar()` no PoC | Substituto | Trocar pela API de embeddings |
| Geração da resposta | Simulada (monta o prompt) | Plugar o LLM barato (ex.: Gemini Flash-Lite) |
| Guardrails | Versão mínima | Adicionar moderação de saída e rota de segurança infantil |

## Divisão do time

- **Banco**: auditar `20260728000300_rls.sql`, revisar índices e o ivfflat.
- **RAG (Claude)**: trocar o vetorizador pelos embeddings reais, ingerir o livro,
  afinar chunking e subir a taxa de acerto em `avaliacao.py`.
- **Infra**: Supabase/Vercel, aplicar migrations, configurar segredos.
- **App (João + Claude)**: Next.js consumindo `buscar_trechos()` e o LLM.

> Segurança: as credenciais de teste usadas no desenvolvimento devem ser
> rotacionadas antes de qualquer uso com dados reais. Nada de segredo no repositório.
