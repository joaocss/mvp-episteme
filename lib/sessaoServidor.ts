// Helpers de sessao para uso em Server Components e rotas.
// Centraliza a leitura do cookie assinado e o RBAC por papel, evitando repetir
// o mesmo bloco de `cookies() + lerToken() + redirect()` em cada pagina.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerSessaoPermitida, PAPEIS_SESSAO, type SessaoUsuario } from "./sessao";

// Qualquer sessao valida (entre todos os papeis). Usada quando a pagina nao
// restringe papel; o RBAC fino fica no exigirPapel.
export async function obterSessao(): Promise<SessaoUsuario | null> {
  const armazem = await cookies();
  return lerSessaoPermitida((n) => armazem.get(n)?.value, PAPEIS_SESSAO);
}

// Exige uma sessao valida com um dos papeis informados; caso contrario redireciona.
// Sem papel permitido mas logado em OUTRO papel -> /paineis; sem sessao nenhuma -> /login.
export async function exigirPapel(papeisPermitidos: string[]): Promise<SessaoUsuario> {
  const armazem = await cookies();
  const obter = (n: string) => armazem.get(n)?.value;
  const permitida = lerSessaoPermitida(obter, papeisPermitidos);
  if (permitida) return permitida;
  const qualquer = lerSessaoPermitida(obter, PAPEIS_SESSAO);
  redirect(qualquer ? "/paineis" : "/login");
}
