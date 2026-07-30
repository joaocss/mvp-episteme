import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../../lib/sessao";
import { obterConfigEscola } from "../../../src/bd/configEscola";
import { Marca } from "../../componentes/Marca";
import ConfiguracoesForm from "./ConfiguracoesForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaConfiguracoes() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) redirect("/login");

  const config = await obterConfigEscola(sessao.escolaId);

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-3xl p-6">
        <Marca compacto />
        <Link href="/gestor" className="mt-4 inline-block text-sm text-roxo hover:underline">← Voltar ao painel</Link>
        <h1 className="mt-2 text-2xl font-bold text-grafite">Configurações da escola</h1>
        <p className="mt-1 text-sm text-slate-500">
          Personalize o nome e a logo exibidos no painel e defina a escala de nota usada nas provas, notas lançadas e nos dashboards.
        </p>
        <div className="mt-6">
          <ConfiguracoesForm nome={config.nome} logoUrl={config.logoUrl} notaMaxima={config.notaMaxima} notaMinimaAprovacao={config.notaMinimaAprovacao} />
        </div>
      </div>
    </main>
  );
}
