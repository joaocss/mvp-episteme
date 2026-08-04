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

// Quebra uma unidade grande demais (ex.: PDF extraido sem linhas em branco, que
// vira um unico "paragrafo" enorme) em pedacos por frase, respeitando o tamanho
// alvo. Sem isso, um PDF inteiro viraria um unico chunk — inutil para o RAG.
function subdividirPorFrase(paragrafo: string, tamanhoAlvo: number): string[] {
  if (paragrafo.length <= tamanhoAlvo * 1.5) return [paragrafo];
  const frases = paragrafo.split(/(?<=[.!?…])\s+/);
  const pedacos: string[] = [];
  let atual = "";
  for (const frase of frases) {
    // Frase unica maior que o alvo: corta no braco por tamanho fixo.
    if (frase.length > tamanhoAlvo * 1.5) {
      if (atual) { pedacos.push(atual.trim()); atual = ""; }
      for (let i = 0; i < frase.length; i += tamanhoAlvo) pedacos.push(frase.slice(i, i + tamanhoAlvo).trim());
      continue;
    }
    if (atual && (atual + " " + frase).length > tamanhoAlvo) { pedacos.push(atual.trim()); atual = frase; }
    else atual = atual ? `${atual} ${frase}` : frase;
  }
  if (atual.trim()) pedacos.push(atual.trim());
  return pedacos.filter(Boolean);
}

export function chunkarTexto(texto: string, tamanhoAlvo = 900, sobreposicao = 150): ChunkTexto[] {
  const limpo = limparRuidoPdf(texto);
  const paragrafos = limpo
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 40)
    // Paragrafos gigantes (tipico de PDF sem quebra dupla) sao subdivididos por frase.
    .flatMap((p) => subdividirPorFrase(p, tamanhoAlvo));

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
