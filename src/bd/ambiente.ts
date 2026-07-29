// Carrega variaveis de .env.local para process.env.
// Faz o parsing manual e SOBRESCREVE valores herdados do shell — assim uma
// variavel obsoleta deixada na sessao do terminal nunca vence o arquivo.
import { existsSync, readFileSync } from "node:fs";

export function carregarEnvLocal(caminho = ".env.local"): void {
  if (!existsSync(caminho)) return;
  const conteudo = readFileSync(caminho, "utf-8");
  for (const linha of conteudo.split(/\r?\n/)) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith("#")) continue;
    const igual = limpa.indexOf("=");
    if (igual === -1) continue;
    const chave = limpa.slice(0, igual).trim();
    let valor = limpa.slice(igual + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    process.env[chave] = valor;
  }
}
