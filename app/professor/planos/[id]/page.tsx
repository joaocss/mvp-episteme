import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPapel } from "../../../../lib/sessaoServidor";
import { obterPlanoEnsino } from "../../../../src/rag/planejamento";
import { LayoutApp } from "../../../componentes/LayoutApp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaPlano({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await exigirPapel(["professor"]);
  const plano = await obterPlanoEnsino(sessao.escolaId, id);
  if (!plano) notFound();

  return (
    <LayoutApp sessao={sessao}>
      <Link href="/professor/planos" className="text-sm text-roxo hover:underline">&larr; Voltar aos planos</Link>
      <article className="mt-4 whitespace-pre-wrap rounded-xl border border-borda bg-superficie p-6 text-sm leading-relaxed text-grafite shadow-cartao">
        {plano.markdown}
      </article>
    </LayoutApp>
  );
}
