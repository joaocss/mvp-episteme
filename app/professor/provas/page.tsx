import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../../lib/sessao";
import { listarProvasProfessor } from "../../../src/bd/provas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROTULO_STATUS: Record<string, string> = {
  rascunho: "Rascunho", publicada: "Publicada", encerrada: "Encerrada",
};
const COR_STATUS: Record<string, string> = {
  rascunho: "bg-creme text-roxo", publicada: "bg-green-100 text-green-800", encerrada: "bg-slate-100 text-slate-600",
};

export default async function PaginaProvas() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") redirect("/login");

  const provas = await listarProvasProfessor(sessao.escolaId, sessao.usuarioId);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/professor" className="text-sm text-roxo hover:underline">← Voltar ao painel</Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Provas</h1>
        <Link href="/professor/provas/nova"
          className="rounded-lg bg-roxo px-4 py-2.5 text-sm font-medium text-white hover:bg-roxo-escuro">
          Elaborar Prova
        </Link>
      </div>
      <p className="mt-1 text-slate-600">
        Gere questões com IA ancoradas no material da escola, revise e publique para a turma.
      </p>

      <section className="mt-8">
        {provas.length === 0 ? (
          <p className="mt-2 text-slate-500">Nenhuma prova criada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {provas.map((p) => (
              <li key={p.id} className="cartao p-3">
                <Link href={`/professor/provas/${p.id}`} className="flex items-center justify-between hover:underline">
                  <div>
                    <span className="font-medium text-grafite">{p.titulo}</span>
                    <span className="ml-2 text-sm text-slate-500">{p.turma} — {p.numeroQuestoes} questão(ões)</span>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${COR_STATUS[p.status]}`}>
                    {ROTULO_STATUS[p.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
