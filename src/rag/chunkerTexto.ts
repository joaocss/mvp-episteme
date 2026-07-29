// Chunker para texto corrido de livro (PDF -> texto). Limpa ruido comum de PDF
// (creditos de ilustracao, avisos de copyright, numeros de pagina soltos) e
// quebra por paragrafo agrupando ate um tamanho-alvo, com sobreposicao.
export interface ChunkTexto { ordem: number; texto: string; }

const RUIDOS: RegExp[] = [
  /reprodu[çc][aã]o proibida[^\n]*/gi,
  /art\.?\s*184 do c[oó]digo penal[^\n]*/gi,
  /lei\s*9\.?\s*610[^\n]*/gi,
  /ilustraç[oõ]es?:\s*[^\n]*?(arquivo da editora|editora)/gi,
  /arquivo da editora/gi,
  /©[^\n]*/g,
];

export function limparRuidoPdf(texto: string): string {
  let t = texto;
  for (const r of RUIDOS) t = t.replace(r, " ");
  // remove linhas que sao so numero de pagina
  t = t.replace(/^\s*\d{1,4}\s*$/gm, " ");
  // colapsa espacos
  return t.replace(/[ \t]{2,}/g, " ");
}

export function chunkarTexto(texto: string, tamanhoAlvo = 900, sobreposicao = 150): ChunkTexto[] {
  const limpo = limparRuidoPdf(texto);
  const paragrafos = limpo
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 40);

  const chunks: ChunkTexto[] = [];
  let buffer = "";
  let ordem = 0;
  for (const par of paragrafos) {
    if (buffer && (buffer + " " + par).length > tamanhoAlvo) {
      chunks.push({ ordem: ordem++, texto: buffer.trim() });
      buffer = `${buffer.slice(-sobreposicao)} ${par}`;
    } else {
      buffer = buffer ? `${buffer} ${par}` : par;
    }
  }
  if (buffer.trim().length > 40) chunks.push({ ordem: ordem++, texto: buffer.trim() });
  return chunks;
}
