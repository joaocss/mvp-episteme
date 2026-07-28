# Conformidade Legal e Regulatória — mvp-episteme

Mapa das normas que regem o Ensino Fundamental e a proteção de dados de menores,
traduzidas em **obrigações concretas para o software**. O objetivo é que cada
decisão de produto e de código nasça amparada, evitando problemas futuros.

> **Aviso:** este documento é um guia técnico de conformidade, não um parecer
> jurídico. As traduções de "norma → requisito" refletem o entendimento de
> engenharia do time. Antes de operar com dados reais de alunos, valide o
> desenho com um advogado especializado em direito educacional e proteção de dados.

## Como ler este documento

Cada norma aparece com três campos: **o que exige**, **impacto no sistema** (o
requisito que ela gera) e, quando já coberto, **onde já tratamos** no projeto.
As normas estão agrupadas por quanto afetam diretamente o nosso software.

---

## Parte A — Impacto DIRETO no software (prioridade)

### A.1 BNCC (Base Nacional Comum Curricular) + Diretrizes Curriculares Nacionais
- **O que exige:** define as competências e aprendizagens essenciais que todo
  aluno deve desenvolver ano a ano; é a referência curricular obrigatória.
- **Impacto no sistema:** todo conteúdo gerado pelo tutor deve ser **ancorado em
  habilidades da BNCC** (ex.: EF06MA01). O material e as respostas se vinculam a
  competências; o progresso do aluno é medido por habilidade.
- **Onde já tratamos:** tabela `competencias_bncc`, vínculo em `feedbacks_ia` e
  `progresso_aluno`, e o grounding do RAG sobre o livro didático + BNCC.

### A.2 ECA — Lei nº 8.069/1990 (art. 53) + LGPD art. 14 (dados de menores)
- **O que exige:** o ECA garante o direito à educação e trata do melhor interesse
  da criança; a LGPD exige **consentimento parental específico e em destaque**
  para tratar dados de menores de 12 anos, sempre no melhor interesse do menor.
- **Impacto no sistema:** registro de consentimento do responsável antes do uso;
  minimização de dados; nunca enviar dado pessoal identificável do aluno ao LLM;
  direito de acesso, correção, eliminação e revogação.
- **Onde já tratamos:** tabela de consentimento no design do módulo, guardrail de
  minimização/PII na entrada da IA, RLS isolando dados por escola, e a rota de
  segurança infantil.

### A.3 Lei nº 13.146/2015 — Estatuto da Pessoa com Deficiência (inclusão)
- **O que exige:** sistema educacional inclusivo em todos os níveis; **proibida a
  cobrança de valores adicionais** de estudantes com deficiência.
- **Impacto no sistema:** o app deve ser **acessível** (seguir WCAG: contraste,
  navegação por teclado, leitor de tela, texto alternativo); o tutor deve
  acomodar ritmos e formas diferentes de aprender; a régua de cobrança (fase 2)
  **não pode** ter acréscimo por deficiência.
- **Onde já tratamos:** a acessibilidade entra como requisito não-funcional do
  frontend (a incluir explicitamente no scaffold do app). A regra de cobrança
  fica registrada para a fase financeira.

### A.4 Lei nº 13.010/2014 (Lei Menino Bernardo) — educação sem castigo físico
- **O que exige:** conscientização e prevenção do uso de castigos físicos e
  tratamento cruel ou degradante como prática educativa.
- **Impacto no sistema:** o tutor **jamais** sugere punição, humilhação ou
  linguagem degradante; o tom é sempre acolhedor e formativo. Isso é uma regra de
  guardrail de saída, não apenas de estilo.
- **Onde já tratamos:** guardrails de saída (tom apropriado à idade) e a rota de
  segurança infantil já vetam esse tipo de conteúdo; formalizar como regra
  explícita no prompt de sistema.

### A.5 Leis nº 10.639/2003 e 11.645/2008 — história e cultura afro-brasileira e indígena
- **O que exige:** ensino obrigatório de história e cultura afro-brasileira e
  indígena no currículo.
- **Impacto no sistema:** ao expandir o tutor para disciplinas de humanas
  (História, Língua Portuguesa, Arte), o conteúdo gerado deve contemplar esses
  temas e evitar estereótipos. Em Matemática (MVP) o gatilho é indireto, mas a
  regra fica registrada para as próximas disciplinas.
- **Onde já tratamos:** registrado como requisito de conteúdo para as fases de
  expansão de disciplinas.

### A.6 Lei nº 13.666/2018 — educação alimentar e nutricional (tema transversal)
- **O que exige:** inclusão da educação alimentar e nutricional como tema
  transversal no currículo do Ensino Fundamental.
- **Impacto no sistema:** quando o conteúdo permitir, o tutor pode integrar o
  tema de forma transversal (ex.: problemas de Matemática contextualizados com
  alimentação saudável). Requisito leve, oportunista.

---

## Parte B — Contexto institucional (afeta o módulo acadêmico, não o tutor)

Estas normas regem a escola e o Estado. Importam para os módulos de gestão
acadêmica e financeira (fases seguintes), não para o tutor de IA em si, mas
ficam mapeadas para o produto não conflitar com elas.

### B.1 Constituição Federal de 1988 (arts. 205 a 214)
- Educação como direito de todos e dever do Estado; Ensino Fundamental
  obrigatório e gratuito na escola pública. **Impacto:** contextual; orienta que
  o produto atende escolas dentro desse arcabouço.

### B.2 LDB — Lei nº 9.394/1996 (arts. 32 a 34)
- Organiza o Ensino Fundamental; **carga horária mínima de 800 horas anuais em
  pelo menos 200 dias** de efetivo trabalho escolar. **Impacto:** o módulo de
  frequência/calendário (fase acadêmica) deve permitir apurar dias letivos e
  carga horária; o controle de frequência precisa suportar essa contabilidade.

### B.3 Lei nº 11.274/2006 — Ensino Fundamental de 9 anos
- Ensino Fundamental com 9 anos, ingresso obrigatório aos 6 anos de idade.
  **Impacto:** o cadastro de séries/turmas segue essa estrutura de 9 anos; o
  nosso recorte de MVP (6º ano) se encaixa nela.

### B.4 Lei nº 14.113/2020 — FUNDEB
- Financiamento público e redistribuição de recursos da Educação Básica.
  **Impacto:** nenhum direto no software; relevante para o discurso comercial
  junto a escolas públicas.

### B.5 Lei nº 13.005/2014 — Plano Nacional de Educação (PNE)
- Metas de 10 anos para universalizar o atendimento de 6 a 14 anos.
  **Impacto:** contextual; reforça a demanda por ferramentas de aprendizagem.

---

## Parte C — Requisitos derivados (checklist consolidado)

Regras concretas que o desenvolvimento deve seguir, extraídas das normas acima:

1. **Ancoragem curricular:** todo conteúdo do tutor vincula-se a uma habilidade
   da BNCC; sem base no material, o tutor recusa (anti-alucinação).
2. **Consentimento parental:** nenhum dado real de aluno menor entra no sistema
   antes do registro de consentimento do responsável.
3. **Minimização de dados:** o LLM nunca recebe dado pessoal identificável do
   aluno; usar pseudonimização.
4. **Direitos do titular:** implementar acesso, correção, eliminação e revogação
   de consentimento com efeito real no banco.
5. **Acessibilidade (WCAG):** o app é navegável por teclado e leitor de tela,
   com contraste adequado e alternativas textuais.
6. **Sem cobrança discriminatória:** a régua financeira não acrescenta valor por
   deficiência.
7. **Pedagogia não-violenta:** o tutor nunca sugere punição ou linguagem
   degradante — regra fixa no prompt de sistema e nos guardrails de saída.
8. **Conteúdo sensível às diversidades:** ao expandir para humanas, contemplar
   história e cultura afro-brasileira e indígena, sem estereótipos.
9. **Contabilidade acadêmica:** o módulo de frequência apura dias letivos e carga
   horária conforme a LDB (800h/200 dias).
10. **Trilha e auditoria:** registro de acessos e operações para prestar contas
    (accountability), incluindo o acesso do professor aos dados do aluno.

---

## Parte D — Cobertura atual

| Requisito | Situação no projeto |
|---|---|
| Ancoragem BNCC | Coberto (schema + RAG com grounding) |
| Consentimento parental | Desenhado (tabela + fluxo); implementar |
| Minimização / PII ao LLM | Coberto no design (guardrail de entrada) |
| Direitos do titular | A implementar |
| Acessibilidade (WCAG) | A incluir explicitamente no app |
| Cobrança não discriminatória | Registrado para a fase financeira |
| Pedagogia não-violenta | Coberto por guardrails; formalizar no prompt |
| Diversidades (10.639/11.645) | Registrado para expansão de disciplinas |
| Carga horária (LDB) | Fase do módulo acadêmico |
| Auditoria / accountability | Coberto (tabela `auditoria`, RLS append-only) |

> Fontes: as referências legais foram fornecidas pela equipe do projeto
> (Planalto, MEC/CNE e materiais correlatos). Confirme a vigência de cada norma
> na data de uso, pois a legislação pode ser alterada.
