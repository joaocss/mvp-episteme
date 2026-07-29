import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../../lib/sessao";
import { listarTurmas, listarProfessores, listarAlunosGeral } from "../../../src/bd/gestao";
import { Marca } from "../../componentes/Marca";
import FormulariosGestao from "./FormulariosGestao";
import TabelasGestao from "./TabelasGestao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaGestao() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) redirect("/login");

  const [turmas, professores, alunos] = await Promise.all([
    listarTurmas(sessao.escolaId),
    listarProfessores(sessao.escolaId),
    listarAlunosGeral(sessao.escolaId),
  ]);

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-5xl p-6">
        <Marca compacto />
        <Link href="/gestor" className="mt-4 inline-block text-sm text-roxo hover:underline">← Voltar ao painel</Link>
        <h1 className="mt-2 text-2xl font-bold text-grafite">Gestão — Cadastros</h1>

        <section className="mt-6">
          <h2 className="mb-3 font-semibold text-grafite">Novo cadastro</h2>
          <FormulariosGestao
            turmas={turmas.map((t) => ({ id: t.id, nome: t.nome }))}
            professores={professores.map((p) => ({ id: p.id, nome: p.nome }))}
          />
        </section>

        <section className="mt-10">
          <TabelasGestao
            turmas={turmas}
            professores={professores}
            alunos={alunos}
            turmasOpcoes={turmas.map((t) => ({ id: t.id, nome: t.nome }))}
          />
        </section>
      </div>
    </main>
  );
}
