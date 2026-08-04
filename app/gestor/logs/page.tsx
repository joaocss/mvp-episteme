import { exigirPapel } from "../../../lib/sessaoServidor";
import { alertasEscola, auditoriaEscola } from "../../../src/bd/gestor";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import { Selo } from "../../componentes/ui/Selo";
import { EstadoVazio } from "../../componentes/ui/EstadoVazio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaLogsGestor() {
  const sessao = await exigirPapel(["gestor", "admin"]);

  const [alertas, auditoria] = await Promise.all([
    alertasEscola(sessao.escolaId),
    auditoriaEscola(sessao.escolaId),
  ]);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Logs e alertas"
        subtitulo="Monitoramento da escola inteira (todas as turmas e professores)."
      />

      <section className="mt-6">
        <h2 className="font-semibold text-grafite">Alertas de guardrail ({alertas.length})</h2>
        {alertas.length === 0 ? (
          <div className="mt-3">
            <EstadoVazio icone="logs" titulo="Nenhum alerta registrado" descricao="Interacoes que disparam o guardrail de seguranca aparecem aqui." />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {alertas.map((a, i) => (
              <li key={i} className={`rounded-xl border p-3.5 ${a.severidade === "alta" ? "border-alerta/30 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                <Selo cor={a.severidade === "alta" ? "alerta" : "aviso"}>{a.categoria} · {a.severidade}</Selo>
                <p className="mt-1.5 text-sm text-slate-600">{a.detalhe}</p>
                <p className="mt-1 text-xs text-slate-400">{a.aluno} · {a.turma} · {a.quando}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-semibold text-grafite">Auditoria ({auditoria.length})</h2>
        {auditoria.length === 0 ? (
          <div className="mt-3">
            <EstadoVazio icone="relatorios" titulo="Nenhum evento de auditoria" descricao="Acoes sensiveis (exportacoes, importacoes) ficam registradas aqui." />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto cartao">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-borda text-slate-500">
                <tr><th className="p-3">Quando</th><th className="p-3">Ator</th><th className="p-3">Acao</th><th className="p-3">Entidade</th></tr>
              </thead>
              <tbody>
                {auditoria.map((e, i) => (
                  <tr key={i} className="border-b border-borda/60">
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
    </LayoutApp>
  );
}
