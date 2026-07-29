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
