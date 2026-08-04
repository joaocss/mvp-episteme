import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../../lib/sessao";
import { listarTurmas, listarAlunosGeral } from "../../../src/bd/gestao";
import { Marca } from "../../componentes/Marca";
import ReenturmarAlunos from "./ReenturmarAlunos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaReenturmar() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) redirect("/login");

  const [turmas, alunos] = await Promise.all([
    listarTurmas(sessao.escolaId),
    listarAlunosGeral(sessao.escolaId),
  ]);

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-4xl p-6">
        <Marca compacto />
        <Link href="/gestor" className="mt-4 inline-block text-sm text-roxo hover:underline">← Voltar ao painel</Link>
        <h1 className="mt-2 text-2xl font-bold text-grafite">Reenturmação de alunos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Mova alunos entre turmas em lote — útil na virada de ano letivo. Filtre pela turma de origem, selecione os alunos e escolha a turma destino.
        </p>
        <div className="mt-6">
          <ReenturmarAlunos
            alunos={alunos.map((a) => ({ id: a.id, nome: a.nome, turma: a.turma, turmaId: a.turmaId }))}
            turmas={turmas.map((t) => ({ id: t.id, nome: t.nome, serie: t.serie }))}
          />
        </div>
      </div>
    </main>
  );
}
