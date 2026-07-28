// Ingestao: quebra o material em trechos, gera embeddings e grava no repositorio.
import { ProvedorEmbeddings, RepositorioTrechos, ChunkParaInserir } from "../ia/tipos";

export interface TrechoBruto {
  titulo: string;
  codigoBncc: string;
  texto: string;
}

// Chunking simples por secao "## Titulo - CODIGO". Trocar por um chunker mais
// fino (por paragrafo/tamanho) ao ingerir o livro real.
export function dividirEmTrechos(markdown: string): TrechoBruto[] {
  const blocos = markdown.split(/\n##\s+/);
  const trechos: TrechoBruto[] = [];
  for (const bloco of blocos) {
    const primeiraLinha = bloco.split("\n")[0];
    if (!primeiraLinha.includes(" - ")) continue;
    const [cabecalho, ...corpo] = bloco.split("\n");
    const [titulo, codigoBncc] = cabecalho.split(" - ");
    const texto = corpo.map((l) => l.trim()).filter(Boolean).join(" ");
    trechos.push({ titulo: titulo.trim(), codigoBncc: (codigoBncc ?? "").trim(), texto });
  }
  return trechos;
}

export async function ingerir(
  escolaId: string,
  materialId: string,
  markdown: string,
  embeddings: ProvedorEmbeddings,
  repositorio: RepositorioTrechos,
): Promise<number> {
  const brutos = dividirEmTrechos(markdown);
  const chunks: ChunkParaInserir[] = [];
  let ordem = 0;
  for (const bruto of brutos) {
    const embedding = await embeddings.gerar(`${bruto.titulo} ${bruto.texto}`);
    chunks.push({
      materialId,
      ordem: ordem++,
      texto: bruto.texto,
      metadados: { titulo: bruto.titulo, codigo_bncc: bruto.codigoBncc },
      embedding,
    });
  }
  await repositorio.inserir(escolaId, chunks);
  return chunks.length;
}
