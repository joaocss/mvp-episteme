// Hashes deterministicos da ingestao incremental (funcoes puras, sem banco).
//
//  - hashArquivo: sha256 do binario do PDF. Idempotencia no nivel do arquivo —
//    reupload identico e detectado como 'duplicada' (custo zero, sem re-extrair).
//  - hashConteudo: sha256 do TEXTO de um chunk (ja normalizado pelo chunker).
//    Reuso no nivel do chunk — versoes diferentes de um mesmo material que
//    compartilham chunks identicos reaproveitam o embedding, so re-vetorizando
//    o que mudou.
import { createHash } from "node:crypto";

export function hashArquivo(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// Normaliza o texto antes de hashear para o hash nao variar por diferenca
// irrelevante de espacos em branco (o chunker ja colapsa, mas garantimos aqui
// para o hash ser estavel mesmo se a origem do texto mudar).
export function hashConteudo(texto: string): string {
  const normalizado = texto.replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalizado, "utf8").digest("hex");
}
