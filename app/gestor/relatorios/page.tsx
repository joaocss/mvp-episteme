import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../../lib/sessao";
import { listarTurmas } from "../../../src/bd/gestao";
import { listarDisciplinas } from "../../../src/bd/disciplinas";
import { gerarRelatorio } from "../../../src/bd/relatorios";
import { Marca } from "../../componentes/Marca";
import RelatoriosDesempenho from "./RelatoriosDesempenho";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaRelatorios() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) redirect("/login");

  const [turmas, disciplinas, inicial] = await Promise.all([
    listarTurmas(sessao.escolaId),
    listarDisciplinas(sessao.escolaId),
    gerarRelatorio(sessao.escolaId, {}),
  ]);

  const rotuloDisciplina = Object.fromEntries(disciplinas.map((d) => [d.slug, d.nome]));

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-5xl p-6">
        <Marca compacto />
        <Link href="/gestor" className="mt-4 inline-block text-sm text-roxo hover:underline">← Voltar ao painel</Link>
        <h1 className="mt-2 text-2xl font-bold text-grafite">Relatórios de desempenho</h1>
        <p className="mt-1 text-sm text-slate-500">
          Filtre por turma, disciplina e período. As notas são normalizadas em percentual para comparar disciplinas com escalas diferentes.
        </p>
        <div className="mt-6">
          <RelatoriosDesempenho
            turmas={turmas.map((t) => ({ id: t.id, nome: t.nome }))}
            disciplinas={disciplinas.map((d) => ({ slug: d.slug, nome: d.nome }))}
            inicial={inicial}
            rotuloDisciplina={rotuloDisciplina}
          />
        </div>
      </div>
    </main>
  );
}
