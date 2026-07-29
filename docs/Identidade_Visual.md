# Identidade Visual — Episteme

*Inteligência que ensina a pensar.*

O nome vem do grego *episteme* (conhecimento verdadeiro, justificado). A marca deve transmitir **conhecimento, confiança e cuidado** — coerente com a tese do produto: a IA como parceira cognitiva que ensina a pensar, não como atalho que substitui o raciocínio.

## Logo

Arquivos em `codigo/public/`:

- `logo-episteme.svg` — lockup completo (ícone + "Episteme" + mote). Uso em telas de entrada, cabeçalhos amplos e materiais.
- `icone-episteme.svg` — apenas o ícone (quadrado roxo com o "E" e a bússola dourada). Uso em espaços compactos, favicon e avatares.

Regras de uso: manter a proporção original, preservar uma margem livre ao redor equivalente à altura do "E", e não recolorir o ícone fora da paleta oficial. Sobre fundos escuros, usar a versão do ícone com o quadrado roxo mantido.

## Paleta

| Cor | Hex | Uso |
|---|---|---|
| Roxo profundo (primária) | `#3B2C63` | Marca, botões primários, títulos, ícone. |
| Grafite-índigo | `#2A2540` | Texto principal, wordmark. |
| Dourado (acento) | `#C79A3B` | Detalhes, destaques, a bússola. Uso pontual. |
| Creme (fundo) | `#F3EFDD` | Fundos suaves, telas de entrada. |
| Cinza-claro | `#F1F5F9` | Superfícies neutras, cartões. |
| Vermelho (alerta) | `#B91C1C` | Alertas de segurança. |

O dourado é acento, não cor de área: usar em pequenos detalhes para não competir com o roxo.

## Tipografia

- **Títulos e marca:** serifada (Georgia/Times) — transmite tradição e credibilidade acadêmica.
- **Interface e texto corrido:** sem serifa do sistema (a stack padrão do app) — legibilidade em tela.

## Ergonomia e usabilidade (princípios)

Estes princípios guiam cada tela, alinhados também ao Estatuto da Pessoa com Deficiência (acessibilidade) e à filosofia do produto.

1. **Contraste e legibilidade (WCAG AA):** texto com contraste mínimo de 4,5:1; nunca comunicar só por cor (usar rótulo/ícone junto).
2. **Alvos de toque generosos:** botões e links com área confortável (mín. ~44px), especialmente pensando em crianças e em quem usa toque.
3. **Hierarquia clara:** uma ação primária evidente por tela; o secundário discreto. Menos escolhas por vez reduz a carga cognitiva.
4. **Feedback imediato:** todo clique tem resposta visível (estado de carregando, sucesso, erro). O usuário nunca fica sem saber o que aconteceu.
5. **Redução de carga cognitiva:** telas enxutas, linguagem simples e adequada à idade; evitar jargão. Coerente com o combate à "descarga cognitiva" que fundamenta o projeto.
6. **Consistência:** mesmos padrões de cor, espaçamento e componentes em todo o sistema, para o usuário aprender uma vez e reconhecer sempre.
7. **Acessibilidade estrutural:** navegação por teclado, rótulos associados aos campos, `aria-live` em áreas que atualizam (como o chat), textos alternativos nas imagens.
8. **Inclusão de neurodivergentes:** rotina visual previsível, instruções passo a passo, evitar mudanças bruscas de layout — princípios que também orientam as adaptações pedagógicas do módulo de planejamento.

> Esta é a base da identidade para o piloto. Refinamentos (biblioteca de componentes, tokens de design, favicon, versão dark) entram nas próximas iterações.
