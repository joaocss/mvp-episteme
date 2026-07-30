import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../../lib/sessao";
import { alertasEscola, auditoriaEscola } from "../../../src/bd/gestor";
import { Marca } from "../../componentes/Marca";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaLogsGestor() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) redirect("/login");

  const [alertas, auditoria] = await Promise.all([
    alertasEscola(sessao.escolaId),
    auditoriaEscola(sessao.escolaId),
  ]);

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-4xl p-6">
        <Marca compacto />
        <Link href="/gestor" className="mt-4 inline-block text-sm text-roxo hover:underline">← Voltar ao painel</Link>
        <h1 className="mt-2 text-2xl font-bold text-grafite">Logs e alertas de monitoramento</h1>
        <p className="mt-1 text-sm text-slate-500">Visão da escola inteira (todas as turmas e professores).</p>

        <section className="mt-6">
          <h2 className="font-semibold text-grafite">Alertas de guardrail ({alertas.length})</h2>
          {alertas.length === 0 ? (
            <p className="mt-2 text-slate-500">Nenhum alerta registrado.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {alertas.map((a, i) => (
                <li key={i} className={`rounded-md border p-3 ${a.severidade === "alta" ? "border-red-300 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                  <p className="text-sm font-medium text-slate-800">{a.categoria} · {a.severidade}</p>
                  <p className="text-sm text-slate-600">{a.detalhe}</p>
                  <p className="mt-1 text-xs text-slate-400">{a.aluno} · {a.turma} · {a.quando}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-semibold text-grafite">Auditoria ({auditoria.length})</h2>
          {auditoria.length === 0 ? (
            <p className="mt-2 text-slate-500">Nenhum evento de auditoria registrado.</p>
          ) : (
            <div className="mt-3 overflow-x-auto cartao">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr><th className="p-3">Quando</th><th className="p-3">Ator</th><th className="p-3">Ação</th><th className="p-3">Entidade</th></tr>
                </thead>
                <tbody>
                  {auditoria.map((e, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="p-3 text-slate-500">{e.quando}</td>
                      <td className="p-3">{e.ator ?? "—"}</td>
                      <td className="p-3">{e.acao}</td>
                      <td className="p-3">{e.entidade ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
