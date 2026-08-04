// Helpers de sessao para uso em Server Components e rotas.
// Centraliza a leitura do cookie assinado e o RBAC por papel, evitando repetir
// o mesmo bloco de `cookies() + lerToken() + redirect()` em cada pagina.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken, type SessaoUsuario } from "./sessao";

const NOME_COOKIE = "sessao_aluno";

export async function obterSessao(): Promise<SessaoUsuario | null> {
  const armazem = await cookies();
  return lerToken(armazem.get(NOME_COOKIE)?.value);
}

// Exige uma sessao valida com um dos papeis informados; caso contrario redireciona.
// Sem papel valido logado -> /login; logado mas sem permissao -> /paineis.
export async function exigirPapel(papeisPermitidos: string[]): Promise<SessaoUsuario> {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  if (!papeisPermitidos.includes(sessao.papel)) redirect("/paineis");
  return sessao;
}
