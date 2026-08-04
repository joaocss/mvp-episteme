// Ingestao in-app de um PDF ja cadastrado como material: extrai o texto,
// quebra em trechos (chunkerTexto), gera embeddings em lote e grava em
// material_chunks. Atualiza materiais_fonte.status_ingestao ao longo do
// processo. Reusa o provedor de embeddings (o MESMO da consulta) e o
// RepositorioPostgres. Pensado para ser chamado de uma rota de API (Node).
import { criarEmbeddings } from "../ia/fabricaEmbeddings";
import { ChunkParaInserir } from "../ia/tipos";
import { RepositorioPostgres } from "./repositorioPostgres";
import { chunkarTexto } from "./chunkerTexto";
import { extrairTextoPdf } from "./extrairPdf";
import { atualizarStatusIngestao } from "../bd/materiais";

const TAM_LOTE = Number(process.env.TAM_LOTE ?? 100);

export interface ResultadoIngestao {
  trechos: number;
  paginas: number;
  caracteres: number;
}

// Ingere um PDF (bytes) para um material ja criado. Em caso de erro, marca o
// material como 'erro' e relanca para a rota tratar.
export async function ingerirPdf(
  escolaId: string,
  materialId: string,
  dadosPdf: Uint8Array,
): Promise<ResultadoIngestao> {
  const embeddings = criarEmbeddings();
  const repo = new RepositorioPostgres();
  try {
    await atualizarStatusIngestao(escolaId, materialId, "processando");

    const { texto, paginas } = await extrairTextoPdf(dadosPdf);
    const chunks = chunkarTexto(texto);
    if (chunks.length === 0) {
      throw new Error("PDF sem texto extraivel (pode ser um PDF escaneado/imagem).");
    }

    for (let i = 0; i < chunks.length; i += TAM_LOTE) {
      const grupo = chunks.slice(i, i + TAM_LOTE);
      const vetores = typeof embeddings.gerarLote === "function"
        ? await embeddings.gerarLote(grupo.map((c) => c.texto))
        : await Promise.all(grupo.map((c) => embeddings.gerar(c.texto)));
      const paraInserir: ChunkParaInserir[] = grupo.map((c, j) => ({
        materialId,
        ordem: c.ordem,
        texto: c.texto,
        metadados: { fonte: materialId, origem: "pdf" },
        embedding: vetores[j],
      }));
      await repo.inserir(escolaId, paraInserir);
    }

    await atualizarStatusIngestao(escolaId, materialId, "concluido");
    return { trechos: chunks.length, paginas, caracteres: texto.length };
  } catch (e) {
    await atualizarStatusIngestao(escolaId, materialId, "erro").catch(() => {});
    throw e;
  }
}
