// Registro de modulos do Episteme — FONTE DE VERDADE da modularizacao.
//
// Cada funcionalidade do produto e um "modulo" de primeira classe: um objeto com
// id estavel, rotulo, se e essencial (sempre ligado) ou opcional (a escola pode
// ligar/desligar), e as rotas que ele expoe na navegacao, cada uma amarrada aos
// papeis que a enxergam. A barra lateral (CascaApp) e derivada DAQUI, filtrando
// pelos modulos habilitados na escola — em vez de um mapa estatico por papel.
//
// Por que assim: o Episteme e multi-tenant. Modularizar deixa cada escola com o
// conjunto de modulos que contratou (venda a la carte) e deixa uma feature nova
// nascer como um modulo isolado — sem tocar no nucleo. Modulos essenciais
// (tutor, cadastros, seguranca) nao podem ser desligados: sao o piso do produto.
import type { NomeIcone } from "../../app/componentes/ui/Icone";

export type Papel = "gestor" | "admin" | "professor" | "aluno";

// Uma entrada de navegacao dentro de um modulo. `ordem` posiciona o item na
// barra lateral (menor = mais acima); e global por papel, entao um mesmo modulo
// pode aparecer em posicoes diferentes para papeis diferentes.
export interface RotaModulo {
  rotulo: string;
  href: string;
  icone: NomeIcone;
  papeis: Papel[];
  ordem: number;
  // Se false, o link so fica ativo no match exato do caminho (nao em subrotas).
  prefixo?: boolean;
}

export interface Modulo {
  id: string; // slug estavel, gravado em modulos_escola. Nunca renomear.
  nome: string; // rotulo amigavel no painel de modulos do gestor.
  descricao: string;
  // Essencial = piso do produto, sempre habilitado (nao aparece como desligavel).
  // Opcional = a escola liga/desliga em /gestor/modulos.
  essencial: boolean;
  rotas: RotaModulo[];
}

// Ordem de declaracao nao importa para a nav (ela ordena por `ordem`); importa
// para o painel de modulos do gestor, que lista nesta sequencia.
export const MODULOS: Modulo[] = [
  {
    id: "visao-geral",
    nome: "Visao geral",
    descricao: "Paineis iniciais de cada papel com os indicadores do dia a dia.",
    essencial: true,
    rotas: [
      { rotulo: "Visao geral", href: "/gestor", icone: "painel", papeis: ["gestor", "admin"], ordem: 10, prefixo: false },
      { rotulo: "Painel", href: "/professor", icone: "painel", papeis: ["professor"], ordem: 10, prefixo: false },
    ],
  },
  {
    id: "tutor",
    nome: "Tutor de IA",
    descricao: "Coracao do Episteme: o tutor que ensina o aluno a pensar, ancorado no material da escola.",
    essencial: true,
    rotas: [
      { rotulo: "Tutor", href: "/tutor", icone: "tutor", papeis: ["aluno"], ordem: 10, prefixo: false },
    ],
  },
  {
    id: "cadastros",
    nome: "Cadastros",
    descricao: "Turmas, professores, alunos, vinculos e dados de familia.",
    essencial: true,
    rotas: [
      { rotulo: "Cadastros", href: "/gestor/gestao", icone: "cadastros", papeis: ["gestor", "admin"], ordem: 20 },
      { rotulo: "Reenturmar", href: "/gestor/reenturmar", icone: "reenturmar", papeis: ["gestor", "admin"], ordem: 40 },
      { rotulo: "Dados dos alunos", href: "/gestor/alunos", icone: "alunos", papeis: ["gestor", "admin"], ordem: 50 },
    ],
  },
  {
    id: "materiais",
    nome: "Materiais e conteudo",
    descricao: "Upload de PDFs (apostilas, capitulos, listas) que viram fonte do tutor, escopados por turma.",
    essencial: false,
    rotas: [
      { rotulo: "Materiais", href: "/gestor/materiais", icone: "materiais", papeis: ["gestor", "admin"], ordem: 30 },
      { rotulo: "Materiais", href: "/professor/materiais", icone: "materiais", papeis: ["professor"], ordem: 40 },
    ],
  },
  {
    id: "provas",
    nome: "Provas e avaliacoes",
    descricao: "Elaboracao de provas com IA, correcao assistida e resposta do aluno questao a questao.",
    essencial: false,
    rotas: [
      { rotulo: "Provas", href: "/professor/provas", icone: "provas", papeis: ["professor"], ordem: 20 },
      { rotulo: "Provas", href: "/provas", icone: "provas", papeis: ["aluno"], ordem: 20 },
    ],
  },
  {
    id: "planejamento",
    nome: "Planejamento de aula",
    descricao: "Planos de ensino e de aula gerados com IA, considerando BNCC, livro e alunos atipicos.",
    essencial: false,
    rotas: [
      { rotulo: "Planejamento", href: "/professor/planos", icone: "planos", papeis: ["professor"], ordem: 30 },
    ],
  },
  {
    id: "desempenho",
    nome: "Notas e desempenho",
    descricao: "Lancamento de notas/faltas e dashboards de acertos por prova e por questao.",
    essencial: false,
    rotas: [
      { rotulo: "Desempenho", href: "/gestor/desempenho", icone: "desempenho", papeis: ["gestor", "admin"], ordem: 60 },
      { rotulo: "Notas e faltas", href: "/professor/desempenho", icone: "desempenho", papeis: ["professor"], ordem: 50 },
    ],
  },
  {
    id: "analytics",
    nome: "Relatorios",
    descricao: "Relatorios da escola com filtros por turma, disciplina, periodo e competencia.",
    essencial: false,
    rotas: [
      { rotulo: "Relatorios", href: "/gestor/relatorios", icone: "relatorios", papeis: ["gestor", "admin"], ordem: 70 },
    ],
  },
  {
    id: "seguranca",
    nome: "Seguranca e auditoria",
    descricao: "Trilha de auditoria e alertas de guardrail de toda a escola.",
    essencial: true,
    rotas: [
      { rotulo: "Logs e alertas", href: "/gestor/logs", icone: "logs", papeis: ["gestor", "admin"], ordem: 80 },
    ],
  },
  {
    id: "administracao",
    nome: "Administracao da escola",
    descricao: "Configuracoes da escola e gestao dos modulos ativos.",
    essencial: true,
    rotas: [
      { rotulo: "Modulos", href: "/gestor/modulos", icone: "modulos", papeis: ["gestor", "admin"], ordem: 85 },
      { rotulo: "Configuracoes", href: "/gestor/configuracoes", icone: "config", papeis: ["gestor", "admin"], ordem: 90 },
    ],
  },
];

// Ids dos modulos essenciais (sempre habilitados). Uteis para o bd nao precisar
// gravar linha para eles e para o painel de modulos travar o toggle.
export const MODULOS_ESSENCIAIS: ReadonlySet<string> = new Set(
  MODULOS.filter((m) => m.essencial).map((m) => m.id),
);

export const MODULOS_OPCIONAIS: Modulo[] = MODULOS.filter((m) => !m.essencial);

// Descobre a que modulo uma rota pertence (usado por guardas/telemetria futuras).
export function moduloDaRota(href: string): Modulo | undefined {
  return MODULOS.find((m) => m.rotas.some((r) => r.href === href));
}

// Item de navegacao ja pronto para a barra lateral (mesma forma de ItemNav).
export interface ItemNavegacao {
  rotulo: string;
  href: string;
  icone: NomeIcone;
  prefixo?: boolean;
}

// Monta a navegacao de um papel: percorre os modulos habilitados, pega as rotas
// visiveis para o papel e ordena por `ordem`. `habilitados` = ids dos modulos
// ligados na escola (essenciais sempre entram, mesmo fora do conjunto).
export function montarNav(papel: Papel, habilitados: ReadonlySet<string>): ItemNavegacao[] {
  const itens: (ItemNavegacao & { ordem: number })[] = [];
  for (const modulo of MODULOS) {
    if (!modulo.essencial && !habilitados.has(modulo.id)) continue;
    for (const rota of modulo.rotas) {
      if (!rota.papeis.includes(papel)) continue;
      itens.push({ rotulo: rota.rotulo, href: rota.href, icone: rota.icone, prefixo: rota.prefixo, ordem: rota.ordem });
    }
  }
  return itens
    .sort((a, b) => a.ordem - b.ordem)
    .map(({ ordem: _ordem, ...item }) => item);
}

