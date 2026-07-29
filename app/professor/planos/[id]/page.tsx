import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { lerToken } from "../../../../lib/sessao";
import { obterPlanoEnsino } from "../../../../src/rag/planejamento";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaPlano({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") redirect("/login");
  const plano = await obterPlanoEnsino(sessao.escolaId, id);
  if (!plano) notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/professor/planos" className="text-sm text-[#3B2C63] hover:underline">← Voltar aos planos</Link>
      <article className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-800">
        {plano.markdown}
      </article>
    </main>
  );
}
