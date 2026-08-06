// Pipeline de ingestao INCREMENTAL de um PDF para um material ja cadastrado.
// Porte (TypeScript nativo) dos conceitos de rag-ingestao-incremental:
//
//   1. hash do arquivo -> se uma versao nao-excluida deste material ja tem o
//      mesmo hash, e 'duplicada' (custo zero, nem extrai).
//   2. cria uma nova VERSAO (extraindo -> vetorizando).
//   3. extrai texto -> chunk -> hash de cada chunk.
//   4. reaproveita embeddings dos chunks identicos da versao vigente anterior;
//      so vetoriza os chunks novos/alterados.
//   5. insere os chunks sob a nova versao.
//   6. PUBLICA de forma atomica: a nova versao vira 'vigente' e a anterior
//      'substituida' na mesma transacao (sem janela de resposta errada).
//
// Reusa extrairTextoPdf, chunkarTexto e o MESMO provedor de embeddings da busca.
// materiais_fonte.status_ingestao continua espelhando o estado para a lista.
import { criarEmbeddings } from "../../ia/fabricaEmbeddings";
import { chunkarTexto } from "../chunkerTexto";
import { extrairTextoPdf } from "../extrairPdf";
import { atualizarStatusIngestao } from "../../bd/materiais";
import {
  versaoComHash, versaoVigente, proximaVersao, criarVersao, atualizarStatusVersao,
  embeddingsPorHash, inserirChunksVersao, publicarVersao, vetorLiteral, type ChunkVersao,
} from "../../bd/materiaisVersoes";
import { hashArquivo, hashConteudo } from "./hashes";

const TAM_LOTE = Number(process.env.TAM_LOTE ?? 100);

export interface ResultadoIncremental {
  status: "vigente" | "duplicada";
  versao: number;
  trechos: number;
  reusados: number;
  paginas: number;
  caracteres: number;
}

export async function ingerirPdfIncremental(
  escolaId: string,
  materialId: string,
  dadosPdf: Uint8Array,
): Promise<ResultadoIncremental> {
  const embeddings = criarEmbeddings();
  const hashArq = hashArquivo(dadosPdf);

  // 1) Idempotencia: reupload identico -> nada a fazer.
  const jaExiste = await versaoComHash(escolaId, materialId, hashArq);
  if (jaExiste) {
    return {
      status: "duplicada",
      versao: jaExiste.versao,
      trechos: jaExiste.chunksTotal,
      reusados: jaExiste.chunksTotal,
      paginas: jaExiste.paginas ?? 0,
      caracteres: jaExiste.caracteres ?? 0,
    };
  }

  // 2) Nova versao (a anterior segue vigente ate a publicacao atomica no fim).
  const vigenteAnterior = await versaoVigente(escolaId, materialId);
  const numero = await proximaVersao(escolaId, materialId);
  const versaoId = await criarVersao(escolaId, materialId, numero, hashArq);
  await atualizarStatusIngestao(escolaId, materialId, "processando");

  try {
    // 3) Extrai e chunka.
    const { texto, paginas } = await extrairTextoPdf(dadosPdf);
    const chunks = chunkarTexto(texto);
    if (chunks.length === 0) {
      throw new Error("PDF sem texto extraivel (pode ser um PDF escaneado/imagem).");
    }

    // 4) Reuso: mapa hash->embedding da versao vigente anterior.
    const reuso = vigenteAnterior
      ? await embeddingsPorHash(escolaId, vigenteAnterior.id)
      : new Map<string, string>();

    await atualizarStatusVersao(escolaId, versaoId, "vetorizando", { paginas, caracteres: texto.length });

    const comHash = chunks.map((c) => ({ ...c, hash: hashConteudo(c.texto) }));
    const novos = comHash.filter((c) => !reuso.has(c.hash));

    // Vetoriza SO os chunks novos/alterados, em lotes.
    const embeddingPorHashNovo = new Map<string, string>();
    for (let i = 0; i < novos.length; i += TAM_LOTE) {
      const grupo = novos.slice(i, i + TAM_LOTE);
      const vetores = typeof embeddings.gerarLote === "function"
        ? await embeddings.gerarLote(grupo.map((c) => c.texto))
        : await Promise.all(grupo.map((c) => embeddings.gerar(c.texto)));
      grupo.forEach((c, j) => embeddingPorHashNovo.set(c.hash, vetorLiteral(vetores[j])));
    }

    // Monta os chunks da versao (reusados + novos), preservando a ordem.
    const paraInserir: ChunkVersao[] = comHash.map((c) => ({
      ordem: c.ordem,
      texto: c.texto,
      hashConteudo: c.hash,
      metadados: { fonte: materialId, origem: "pdf", versao: numero },
      embeddingLiteral: reuso.get(c.hash) ?? embeddingPorHashNovo.get(c.hash)!,
    }));

    // 5) Insere os chunks da nova versao.
    await inserirChunksVersao(escolaId, materialId, versaoId, paraInserir);
    const reusados = comHash.length - novos.length;
    await atualizarStatusVersao(escolaId, versaoId, "vetorizando", {
      chunksTotal: paraInserir.length, chunksReusados: reusados,
    });

    // 6) Publicacao atomica: a nova versao vira vigente; a anterior, substituida.
    await publicarVersao(escolaId, materialId, versaoId);
    await atualizarStatusIngestao(escolaId, materialId, "concluido");

    return {
      status: "vigente",
      versao: numero,
      trechos: paraInserir.length,
      reusados,
      paginas,
      caracteres: texto.length,
    };
  } catch (e: any) {
    // A versao com falha fica registrada (status 'falhou'); a versao vigente
    // anterior CONTINUA vigente — a revisao que quebrou nao derruba o material.
    await atualizarStatusVersao(escolaId, versaoId, "falhou", { erro: String(e?.message ?? e) }).catch(() => {});
    await atualizarStatusIngestao(escolaId, materialId, vigenteAnterior ? "concluido" : "erro").catch(() => {});
    throw e;
  }
}
