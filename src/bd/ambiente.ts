// Carrega variaveis de .env.local para process.env, se o arquivo existir.
// Usa process.loadEnvFile (Node >= 20.12). Sem dependencia externa.
import { existsSync } from "node:fs";

export function carregarEnvLocal(caminho = ".env.local"): void {
  const proc = process as unknown as { loadEnvFile?: (p: string) => void };
  if (existsSync(caminho) && typeof proc.loadEnvFile === "function") {
    proc.loadEnvFile(caminho);
  }
}
