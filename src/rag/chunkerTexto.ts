// Chunker para texto corrido de livro (PDF -> texto). Diferente do chunker por
// secao "## Titulo - CODIGO", este quebra por paragrafo agrupando ate um
// tamanho-alvo, com sobreposicao para nao perder contexto na borda.
export interface ChunkTexto { ordem: number; texto: string; }

export function chunkarTexto(texto: string, tamanhoAlvo = 900, sobreposicao = 150): ChunkTexto[] {
  const paragrafos = texto
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 40); // descarta ruido/linhas curtas

  const chunks: ChunkTexto[] = [];
  let buffer = "";
  let ordem = 0;
  for (const par of paragrafos) {
    if (buffer && (buffer + " " + par).length > tamanhoAlvo) {
      chunks.push({ ordem: ordem++, texto: buffer.trim() });
      const cauda = buffer.slice(-sobreposicao);
      buffer = `${cauda} ${par}`;
    } else {
      buffer = buffer ? `${buffer} ${par}` : par;
    }
  }
  if (buffer.trim().length > 40) chunks.push({ ordem: ordem++, texto: buffer.trim() });
  return chunks;
}
