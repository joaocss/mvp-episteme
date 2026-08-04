import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../../lib/sessao";
import { Marca } from "../../componentes/Marca";
import ImportarAlunos from "./ImportarAlunos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaDadosAlunos() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) redirect("/login");

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-3xl p-6">
        <Marca compacto />
        <Link href="/gestor" className="mt-4 inline-block text-sm text-roxo hover:underline">← Voltar ao painel</Link>
        <h1 className="mt-2 text-2xl font-bold text-grafite">Dados dos alunos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Importe alunos em lote por planilha e baixe os dados cadastrais. O download é restrito ao diretor e fica registrado na auditoria.
        </p>

        <div className="mt-6 space-y-6">
          <section className="cartao p-5">
            <h2 className="text-lg font-semibold text-grafite">Baixar dados (CSV)</h2>
            <p className="mt-1 text-sm text-slate-500">Exporta nome, e-mail, turma, data de nascimento e dados da família.</p>
            <a
              href="/api/gestor/alunos/export"
              className="mt-3 inline-block rounded-md bg-[#3B2C63] px-3 py-2 text-sm font-medium text-white hover:bg-[#2f2350]"
            >
              Baixar CSV dos alunos
            </a>
          </section>

          <ImportarAlunos />
        </div>
      </div>
    </main>
  );
}
