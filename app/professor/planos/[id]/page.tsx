import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPapel } from "../../../../lib/sessaoServidor";
import { obterPlanoEnsino } from "../../../../src/rag/planejamento";
import { obterConfigEscola } from "../../../../src/bd/configEscola";
import { LayoutApp } from "../../../componentes/LayoutApp";
import DocumentoPlano from "./DocumentoPlano";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaPlano({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await exigirPapel(["professor"]);
  const [plano, config] = await Promise.all([
    obterPlanoEnsino(sessao.escolaId, id),
    obterConfigEscola(sessao.escolaId),
  ]);
  if (!plano) notFound();

  return (
    <LayoutApp sessao={sessao}>
      <Link href="/professor/planos" className="text-sm text-roxo hover:underline no-imprimir">&larr; Voltar aos planos</Link>
      <div className="mt-3">
        <DocumentoPlano markdown={plano.markdown} nomeEscola={config.nome} logoUrl={config.logoUrl} />
      </div>
    </LayoutApp>
  );
}
