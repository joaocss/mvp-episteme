import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../lib/sessao";
import { listarProvasDisponiveis } from "../../src/bd/provas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaProvasAluno() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "aluno") redirect("/login");

  const provas = await listarProvasDisponiveis(sessao.escolaId, sessao.usuarioId);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/tutor" className="text-sm text-roxo hover:underline">← Voltar ao tutor</Link>
      <h1 className="mt-2 text-2xl font-bold text-grafite">Provas</h1>
      <p className="mt-1 text-slate-600">Responda uma questão por vez. Você pode pedir dicas e feedback da IA a qualquer momento.</p>

      <section className="mt-6">
        {provas.length === 0 ? (
          <p className="text-slate-500">Nenhuma prova disponível no momento.</p>
        ) : (
          <ul className="space-y-2">
            {provas.map((p) => {
              const concluida = p.respondidas >= p.numeroQuestoes;
              return (
                <li key={p.id} className="cartao p-3">
                  <Link href={`/provas/${p.id}`} className="flex items-center justify-between hover:underline">
                    <div>
                      <span className="font-medium text-grafite">{p.titulo}</span>
                      <span className="ml-2 text-sm text-slate-500">{p.turma} — {p.assunto}</span>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${concluida ? "bg-green-100 text-green-800" : "bg-creme text-roxo"}`}>
                      {p.respondidas}/{p.numeroQuestoes} {concluida ? "concluída" : "respondidas"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
