// Hash de senha simples (pbkdf2). Suficiente para o piloto; revisar em producao.
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const ITER = 120000;

export function gerarHashSenha(senha: string): string {
  const sal = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(senha, sal, ITER, 32, "sha256").toString("hex");
  return `${sal}:${hash}`;
}

export function verificarSenha(senha: string, armazenado: string | null | undefined): boolean {
  if (!armazenado || !armazenado.includes(":")) return false;
  const [sal, hash] = armazenado.split(":");
  const calc = pbkdf2Sync(senha, sal, ITER, 32, "sha256").toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(calc, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
