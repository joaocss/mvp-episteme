import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { lerToken } from "../../../../lib/sessao";
import { conversaDaSessao } from "../../../../src/bd/professor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaSessao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") redirect("/login");

  const conversa = await conversaDaSessao(sessao.usuarioId, id);
  if (!conversa) notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/professor" className="text-sm text-blue-700 hover:underline">← Voltar ao painel</Link>
      <h1 className="mt-2 text-2xl font-bold">Conversa de {conversa.aluno}</h1>
      <div className="mt-6 space-y-3">
        {conversa.mensagens.map((m, i) => (
          <div key={i} className={m.autor === "aluno" ? "text-right" : "text-left"}>
            <span className={`inline-block max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 ${
              m.autor === "aluno" ? "bg-blue-700 text-white" : "border border-slate-200 bg-slate-50"}`}>
              {m.conteudo}
            </span>
            <p className="mt-1 text-xs text-slate-400">{m.autor === "aluno" ? "Aluno" : "Tutor"} · {m.quando}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
