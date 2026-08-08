# Configuração de produção — a parte do João

> O que depende de você (contas, segredos, DNS, dinheiro, jurídico). O código já
> está no ar; isto destrava o resto. Variáveis vão em **Vercel → projeto
> `mvp-episteme-nu8r` → Settings → Environment Variables** (Production).

## 🟢 1. Pôr a Coral Village na nuvem (pros pais testarem)

Precisa da string de conexão do **pooler** do Supabase (Settings → Database →
Connection pooling, porta 6543 — contém a senha do banco). No PowerShell, dentro
de `codigo/`:

```powershell
$env:DATABASE_URL_CLOUD="postgresql://postgres.gkycodihvnnrfldibywy:SUA_SENHA@aws-0-<regiao>.pooler.supabase.com:6543/postgres"

# 1) cria a escola + ingere o acervo já baixado (119 materiais / ~59k trechos)
$env:NOME_ESCOLA="Coral Village"
npx tsx local/ingerir_conteudos.ts "C:/Users/JOAOSA/Claude/Projects/ENEM/lv/downloads"

# 2) cria os logins de teste (gestor@coral.teste / aluno@coral.teste, senha coral123)
npx tsx local/criar_usuarios_teste.ts

# 3) confere o mapa de usuários da nuvem
npx tsx local/listar_usuarios.ts
```

> ⚠️ ~250–350 MB de vetores apertam o Supabase Free (500 MB) — ver item 5.

## ✉️ 2. E-mails (convite de senha / "esqueci a senha" / onboarding)

Sem isto, os e-mails **não saem** (não quebra nada; no cadastro self-service o
link aparece na tela). Para enviar de verdade:

1. Criar conta no **Resend** (resend.com).
2. **Verificar um domínio** (adicionar os registros SPF/DKIM/DMARC que o Resend
   mostrar no DNS — ver item 3). Para teste rápido dá pra usar o remetente
   `onboarding@resend.dev` sem domínio.
3. Na Vercel, adicionar:
   - `RESEND_API_KEY` = a chave do Resend
   - `EMAIL_REMETENTE` = `Episteme <avisos@meuepisteme.com.br>` (ou `onboarding@resend.dev` no teste)

## 🌐 3. Domínio `meuepisteme.com.br`

1. Registrar/pagar no **registro.br** (~R$40/ano).
2. Na **Vercel → Settings → Domains**, adicionar `meuepisteme.com.br` (e
   `app.meuepisteme.com.br` se quiser separar o app). A Vercel mostra 1–2
   registros (A/CNAME) — colar no painel de DNS do registro.br.
3. (Opcional) Definir `HEALTH_URL` no GitHub Actions Variables para o keep-alive
   apontar pro domínio novo.

## 🔑 4. Chaves de IA e segredos (Vercel)

Confirme que existem em Production (e que a chave OpenAI é de **conta sua com
billing + limite de gasto**):
- `OPENAI_API_KEY` (+ `LLM_API_KEY` / `EMBEDDING_API_KEY` se usados)
- `SESSION_SECRET` = valor **forte e único** (assina o cookie de sessão) — gerar novo em produção
- `DATABASE_URL` = string do **pooler** (6543)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- (Push, opcional) `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`
  — gerar par novo em produção: `npx web-push generate-vapid-keys`

## 💳 5. Custos (quando houver dados/uso real)

- **OpenAI:** billing + trava de gasto (spend cap) na conta.
- **Supabase Pro (~US$25/mês):** ao passar dos 500 MB do Free (o acervo grande já
  chega perto).
- **Vercel:** o plano atual serve; subir se precisar de mais limite de função.

## 🔒 6. Segurança (antes de dados reais)

- Rotacionar a **senha do banco** Supabase (Database → Reset password) e atualizar
  `DATABASE_URL` na Vercel e onde você rodar scripts.
- Garantir `SESSION_SECRET` forte (item 4).
- Migrar a chave OpenAI para a conta definitiva do projeto.
- **Nota de deploy (cookie por papel):** quem estava logado como gestor/professor
  na versão antiga precisa **relogar uma vez**. Alunos seguem logados.

## ⚖️ 7. LGPD / jurídico (antes de dados de crianças — vale mesmo grátis)

- Preencher os `[COLCHETES]` da política (migration `..._termo_privacidade_v2`):
  **razão social/CNPJ** (ou seu nome como responsável), **endereço**, **encarregado
  (DPO)** com nome + e-mail, e confirmar os operadores (OpenAI/Vercel/Supabase).
- **Revisão por advogado** antes de coletar dado real (é dado de menor e sensível,
  com transferência internacional).
- **Consentimento dos pais** assinado antes de cadastrar cada criança.

---

### Cadastro self-service de escola (já no código)

Página pública **`/criar-escola`** (link na tela de login): a escola informa
nome + gestor + e-mail → cria o tenant e o gestor recebe o convite para definir a
senha. Sem Resend, o link aparece na própria tela; com Resend, vai por e-mail.
Multi-tenant por `escola_id` — cada escola só enxerga os próprios dados.
