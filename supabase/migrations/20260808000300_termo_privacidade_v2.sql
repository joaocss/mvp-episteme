-- =====================================================================
-- Politica de Privacidade v2: substitui o PLACEHOLDER pela versao redigida.
--
-- IMPORTANTE: este texto e um RASCUNHO/MODELO sob medida para o Episteme, com
-- campos entre [COLCHETES] para preencher (razao social, CNPJ, encarregado/DPO,
-- contato). NAO tem validade juridica ate ser preenchido e revisado por um
-- advogado. Trata de dados de MENORES e de dados SENSIVEIS (atipicidade/laudos),
-- alem de transferencia internacional (provedor de IA) — pontos que exigem
-- atencao juridica antes de coletar dados reais.
--
-- Publica a v2 como vigente e desliga a v1. O indice parcial garante um unico
-- termo vigente, entao desligamos o anterior ANTES de inserir o novo.
-- Consentimentos antigos (se houver) sao da v1; a nova versao pede novo aceite.
-- =====================================================================

update termos_privacidade set vigente = false where vigente = true;

insert into termos_privacidade (versao, titulo, conteudo, vigente) values (
  '2026-08-v2',
  'Politica de Privacidade e Termo de Consentimento (LGPD)',
  $termo$
Esta Política de Privacidade explica como a plataforma **Episteme** coleta, usa,
compartilha e protege os dados pessoais de alunos, responsáveis e profissionais
das escolas, em conformidade com a Lei nº 13.709/2018 (LGPD).

> **Rascunho para revisão jurídica.** Os campos entre colchetes devem ser
> preenchidos e o texto validado por um advogado antes do tratamento de dados reais.

## 1. Quem é o controlador
O controlador dos dados é **[RAZÃO SOCIAL]**, inscrita no CNPJ **[CNPJ]**, com
sede em **[ENDEREÇO]**. Cada escola cliente atua em conjunto na definição das
finalidades do tratamento de seus alunos.

## 2. Quais dados tratamos
- **Cadastro:** nome, e-mail, turma, série e data de nascimento.
- **Pedagógicos:** notas, frequência, respostas de provas e as interações do
  aluno com o tutor de inteligência artificial e com o modo treinador.
- **Do responsável:** nome e e-mail, para vínculo e comunicação.
- **Dados sensíveis (quando informados pela escola):** informações de
  atipicidade/necessidades específicas e eventuais laudos ou anexos, tratados
  exclusivamente para fins pedagógicos e de inclusão, com consentimento
  específico e destacado (art. 11 da LGPD).
- **Técnicos:** registros de acesso e uso, necessários à segurança e ao
  funcionamento do serviço.

## 3. Para que usamos os dados
Para prestar o serviço educacional: oferecer o tutor de IA ancorado no material
da escola, acompanhar o desempenho, apoiar o planejamento pedagógico e a
inclusão, e comunicar avisos escolares. Não usamos os dados dos alunos para
publicidade nem os vendemos.

## 4. Base legal
O tratamento se apoia em: consentimento dos pais ou responsável legal para dados
de crianças e adolescentes (art. 14); execução do contrato com a escola e
legítimo interesse pedagógico (art. 7); e, para dados sensíveis, consentimento
específico e destacado (art. 11).

## 5. Inteligência artificial: como funciona
As perguntas do aluno e trechos do material da escola são enviados a um provedor
de modelo de linguagem para gerar a resposta do tutor. A IA é usada como
**andaime** (apoio ao raciocínio), não como atalho: quando o assunto foge do
material, o sistema recusa e orienta procurar o professor. As respostas são
ancoradas no material e a origem é sinalizada ao aluno.

## 6. Compartilhamento e operadores
Compartilhamos dados apenas com quem é necessário para operar o serviço:
- a **escola** do aluno;
- provedores que atuam como operadores: **provedor de IA ([OpenAI])**,
  **hospedagem ([Vercel])** e **banco de dados ([Supabase])**.

Alguns desses provedores processam dados **fora do Brasil**. Nesse caso, a
transferência internacional observa as salvaguardas da LGPD (art. 33). Não
compartilhamos dados com terceiros para fins próprios deles.

## 7. Por quanto tempo guardamos
Mantemos os dados enquanto durar o vínculo do aluno com a escola e pelos prazos
legais aplicáveis. Após esse período, os dados são eliminados ou anonimizados,
salvo obrigação legal de guarda.

## 8. Segurança
Adotamos medidas técnicas e organizacionais para proteger os dados, incluindo
controle de acesso por perfil, isolamento entre escolas, criptografia em trânsito
e registro de auditoria das ações sensíveis.

## 9. Seus direitos
Você pode, a qualquer momento, solicitar acesso, correção, portabilidade,
anonimização, eliminação e informações sobre o tratamento, além de **revogar o
consentimento** (art. 18 da LGPD). Para exercer esses direitos, fale com a
secretaria da escola ou com o encarregado indicado abaixo.

## 10. Consentimento dos pais ou responsável (art. 14)
O tratamento de dados de crianças e adolescentes depende do consentimento de ao
menos um dos pais ou do responsável legal. Ao aceitar, você autoriza o tratamento
descrito nesta política, no melhor interesse do estudante.

## 11. Cookies
Usamos apenas um cookie essencial de sessão, necessário para manter você
autenticado. Não usamos cookies de publicidade.

## 12. Alterações desta política
Podemos atualizar esta política; a versão vigente fica sempre disponível nesta
página, e mudanças relevantes podem exigir novo consentimento.

## 13. Encarregado (DPO) e contato
Encarregado pelo tratamento de dados: **[NOME DO ENCARREGADO]** —
**[E-MAIL DO ENCARREGADO]**. Você também pode falar com a secretaria da sua escola.
$termo$,
  true
) on conflict (versao) do nothing;
