import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../../lib/sessao";
import { listarTurmas } from "../../../src/bd/gestao";
import { listarDisciplinas } from "../../../src/bd/disciplinas";
import { listarMateriais } from "../../../src/bd/materiais";
import { Marca } from "../../componentes/Marca";
import GestaoMateriais from "../../componentes/GestaoMateriais";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaMateriaisGestor() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) redirect("/login");

  const [turmas, disciplinas, materiais] = await Promise.all([
    listarTurmas(sessao.escolaId),
    listarDisciplinas(sessao.escolaId),
    listarMateriais(sessao.escolaId),
  ]);

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-5xl p-6">
        <Marca compacto />
        <Link href="/gestor" className="mt-4 inline-block text-sm text-roxo hover:underline">← Voltar ao painel</Link>
        <h1 className="mt-2 text-2xl font-bold text-grafite">Materiais e conteúdo por turma</h1>
        <p className="mt-1 text-sm text-slate-500">
          Envie PDFs (apostilas, listas, capítulos) e vincule às turmas. O tutor de IA usa esse conteúdo como fonte, restrito à turma.
        </p>
        <div className="mt-6">
          <GestaoMateriais
            turmas={turmas.map((t) => ({ id: t.id, nome: t.nome, serie: t.serie, modoEstrito: t.modoEstrito }))}
            disciplinasIniciais={disciplinas}
            materiaisIniciais={materiais}
            ehGestor
          />
        </div>
      </div>
    </main>
  );
}
