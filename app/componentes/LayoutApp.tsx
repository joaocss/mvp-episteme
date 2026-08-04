// Shell do app autenticado (server component). Monta a navegacao conforme o
// papel e injeta os dados de usuario/escola na casca visual (CascaApp).
import { CascaApp, type DadosCasca, type ItemNav } from "./CascaApp";
import { obterUsuarioBasico } from "../../src/bd/usuarios";
import { obterConfigEscola } from "../../src/bd/configEscola";
import type { SessaoUsuario } from "../../lib/sessao";

const ROTULO_PAPEL: Record<string, string> = {
  gestor: "Gestor",
  admin: "Administrador",
  professor: "Professor",
  aluno: "Aluno",
};

const NAV_POR_PAPEL: Record<string, ItemNav[]> = {
  gestor: [
    { rotulo: "Visao geral", href: "/gestor", icone: "painel", prefixo: false },
    { rotulo: "Cadastros", href: "/gestor/gestao", icone: "cadastros" },
    { rotulo: "Materiais", href: "/gestor/materiais", icone: "materiais" },
    { rotulo: "Reenturmar", href: "/gestor/reenturmar", icone: "reenturmar" },
    { rotulo: "Dados dos alunos", href: "/gestor/alunos", icone: "alunos" },
    { rotulo: "Desempenho", href: "/gestor/desempenho", icone: "desempenho" },
    { rotulo: "Relatorios", href: "/gestor/relatorios", icone: "relatorios" },
    { rotulo: "Logs e alertas", href: "/gestor/logs", icone: "logs" },
    { rotulo: "Configuracoes", href: "/gestor/configuracoes", icone: "config" },
  ],
  professor: [
    { rotulo: "Painel", href: "/professor", icone: "painel", prefixo: false },
    { rotulo: "Provas", href: "/professor/provas", icone: "provas" },
    { rotulo: "Planejamento", href: "/professor/planos", icone: "planos" },
    { rotulo: "Materiais", href: "/professor/materiais", icone: "materiais" },
    { rotulo: "Notas e faltas", href: "/professor/desempenho", icone: "desempenho" },
  ],
  aluno: [
    { rotulo: "Tutor", href: "/tutor", icone: "tutor", prefixo: false },
    { rotulo: "Provas", href: "/provas", icone: "provas" },
  ],
};

export async function LayoutApp({
  sessao,
  children,
}: {
  sessao: SessaoUsuario;
  children: React.ReactNode;
}) {
  const [usuario, config] = await Promise.all([
    obterUsuarioBasico(sessao.escolaId, sessao.usuarioId),
    obterConfigEscola(sessao.escolaId),
  ]);

  const dados: DadosCasca = {
    itens: NAV_POR_PAPEL[sessao.papel] ?? NAV_POR_PAPEL.aluno,
    rotuloPapel: ROTULO_PAPEL[sessao.papel] ?? sessao.papel,
    nomeUsuario: usuario?.nome ?? "Usuario",
    emailUsuario: usuario?.email ?? "",
    nomeEscola: config.nome,
    logoEscola: config.logoUrl,
  };

  return <CascaApp dados={dados}>{children}</CascaApp>;
}
