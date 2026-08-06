// Shell do app autenticado (server component). Monta a navegacao conforme o
// papel A PARTIR DO REGISTRO DE MODULOS (src/modulos/registro.ts), filtrando
// pelos modulos habilitados na escola, e injeta os dados de usuario/escola na
// casca visual (CascaApp).
import { CascaApp, type DadosCasca } from "./CascaApp";
import { obterUsuarioBasico } from "../../src/bd/usuarios";
import { obterConfigEscola } from "../../src/bd/configEscola";
import { modulosHabilitados } from "../../src/bd/modulos";
import { montarNav, type Papel } from "../../src/modulos/registro";
import type { SessaoUsuario } from "../../lib/sessao";

const ROTULO_PAPEL: Record<string, string> = {
  gestor: "Gestor",
  admin: "Administrador",
  professor: "Professor",
  aluno: "Aluno",
};

export async function LayoutApp({
  sessao,
  children,
}: {
  sessao: SessaoUsuario;
  children: React.ReactNode;
}) {
  const [usuario, config, habilitados] = await Promise.all([
    obterUsuarioBasico(sessao.escolaId, sessao.usuarioId),
    obterConfigEscola(sessao.escolaId),
    modulosHabilitados(sessao.escolaId),
  ]);

  const dados: DadosCasca = {
    itens: montarNav(sessao.papel as Papel, habilitados),
    rotuloPapel: ROTULO_PAPEL[sessao.papel] ?? sessao.papel,
    nomeUsuario: usuario?.nome ?? "Usuario",
    emailUsuario: usuario?.email ?? "",
    nomeEscola: config.nome,
    logoEscola: config.logoUrl,
  };

  return <CascaApp dados={dados}>{children}</CascaApp>;
}
