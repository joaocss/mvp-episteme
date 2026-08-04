// Extracao de texto de um PDF (upload in-app). Usa unpdf (pdf.js empacotado,
// funciona em ambiente serverless/Node do Next). Retorna o texto corrido de
// todas as paginas; a limpeza de ruido e o chunking ficam por conta do
// chunkerTexto (chunkarTexto/limparRuidoPdf), reusado da ingestao de livro.
import { extractText, getDocumentProxy } from "unpdf";

// O pdf.js empacotado no unpdf usa Math.sumPrecise (ES2025), ausente em Node
// mais antigo — sem ela, cai num caminho de fallback muito lento (dezenas de
// segundos) e polui o log. Polyfill simples (soma sequencial) resolve; a
// precisao extra nao importa para a extracao de texto.
const M = Math as unknown as { sumPrecise?: (valores: Iterable<number>) => number };
if (typeof M.sumPrecise !== "function") {
  M.sumPrecise = (valores: Iterable<number>) => {
    let soma = 0;
    for (const v of valores) soma += v;
    return soma;
  };
}

export async function extrairTextoPdf(dados: Uint8Array): Promise<{ texto: string; paginas: number }> {
  const pdf = await getDocumentProxy(dados);
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  const texto = Array.isArray(text) ? text.join("\n\n") : text;
  return { texto, paginas: totalPages };
}
