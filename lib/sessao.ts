// Sessao simples e assinada (HMAC) em cookie. Temporario, para desenvolvimento.
import { createHmac, timingSafeEqual } from "node:crypto";

const SEGREDO = process.env.SESSION_SECRET ?? "dev-secreto-trocar-em-producao";

export interface SessaoUsuario {
  usuarioId: string;
  escolaId: string;
  papel: string;
}

export function criarToken(sessao: SessaoUsuario): string {
  const dados = Buffer.from(JSON.stringify(sessao)).toString("base64url");
  const assinatura = createHmac("sha256", SEGREDO).update(dados).digest("base64url");
  return `${dados}.${assinatura}`;
}

export function lerToken(token: string | undefined): SessaoUsuario | null {
  if (!token) return null;
  const [dados, assinatura] = token.split(".");
  if (!dados || !assinatura) return null;
  const esperada = createHmac("sha256", SEGREDO).update(dados).digest("base64url");
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(dados, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

// Um cookie de sessao POR PAPEL. Antes todos os papeis dividiam "sessao_aluno",
// entao logar como um papel (ex.: gestor) sobrescrevia a sessao de outro (ex.:
// aluno) no mesmo navegador — comum numa familia que divide o computador. Com um
// cookie por papel as sessoes coexistem e nao se derrubam.
export const PAPEIS_SESSAO = ["aluno", "professor", "gestor", "responsavel", "admin"] as const;

export function nomeCookieSessao(papel: string): string {
  return `sessao_${papel}`;
}

export const NOMES_COOKIE_SESSAO = PAPEIS_SESSAO.map(nomeCookieSessao);

// Retorna a primeira sessao valida entre os cookies dos papeis permitidos.
// `obterValor(nome)` abstrai a origem do cookie (next/headers ou NextRequest),
// para nao acoplar este modulo (que usa node:crypto) ao runtime de cada chamador.
export function lerSessaoPermitida(
  obterValor: (nome: string) => string | undefined,
  papeisPermitidos: readonly string[],
): SessaoUsuario | null {
  for (const papel of papeisPermitidos) {
    const sessao = lerToken(obterValor(nomeCookieSessao(papel)));
    if (sessao && sessao.papel === papel) return sessao;
  }
  return null;
}
