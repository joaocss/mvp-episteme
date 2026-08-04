import Link from "next/link";
import { exigirPapel } from "../../lib/sessaoServidor";
import {
  estatisticasProfessor, listarSessoes, alertas, competenciasTrabalhadas, registrarAcessoProfessor,
} from "../../src/bd/professor";
import { LayoutApp } from "../componentes/LayoutApp";
import { CabecalhoPagina } from "../componentes/ui/CabecalhoPagina";
import { Kpi } from "../componentes/ui/Kpi";
import { Selo } from "../componentes/ui/Selo";
import { EstadoVazio } from "../componentes/ui/EstadoVazio";
import { variantesBotao } from "../componentes/ui/Botao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaProfessor() {
  const sessao = await exigirPapel(["professor"]);

  await registrarAcessoProfessor(sessao.escolaId, sessao.usuarioId);
  const [est, sessoes, listaAlertas, competencias] = await Promise.all([
    estatisticasProfessor(sessao.usuarioId),
    listarSessoes(sessao.usuarioId),
    alertas(sessao.usuarioId),
    competenciasTrabalhadas(sessao.usuarioId),
  ]);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Painel do Professor"
        subtitulo="Acompanhe suas turmas, provas e alertas"
        acoes={
          <>
            <Link href="/professor/materiais" className={variantesBotao({ variante: "secundario", tamanho: "pequeno" })}>
              Materiais
            </Link>
            <Link href="/professor/provas/nova" className={variantesBotao({ variante: "primario", tamanho: "pequeno" })}>
              Elaborar prova
            </Link>
          </>
        }
      />

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Indicadores">
        <Kpi rotulo="Alunos" valor={est.totalAlunos} icone="alunos" />
        <Kpi rotulo="Sessoes" valor={est.totalSessoes} icone="tutor" />
        <Kpi rotulo="Perguntas" valor={est.totalPerguntas} icone="desempenho" />
        <Kpi rotulo="Alertas" valor={est.alertasSeguranca} icone="logs" destaque ativoDestaque={est.alertasSeguranca > 0} />
      </section>

      {listaAlertas.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-grafite">Alertas</h2>
          <ul className="mt-3 space-y-2">
            {listaAlertas.map((a, i) => (
              <li
                key={i}
                className={`rounded-xl border p-3.5 ${a.severidade === "alta" ? "border-alerta/30 bg-red-50" : "border-amber-200 bg-amber-50"}`}
              >
                <div className="flex items-center gap-2">
                  <Selo cor={a.severidade === "alta" ? "alerta" : "aviso"}>{a.categoria} · {a.severidade}</Selo>
                </div>
                <p className="mt-1.5 text-sm text-slate-600">{a.detalhe}</p>
                <p className="mt-1 text-xs text-slate-400">{a.aluno} · {a.quando}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {competencias.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-grafite">Competencias (BNCC) mais trabalhadas</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {competencias.map((c) => (
              <li key={c.codigo}>
                <Selo cor="roxo">
                  <span className="font-semibold">{c.codigo}</span>
                  <span className="opacity-70"> · {c.unidade} · {c.total}</span>
                </Selo>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-grafite">Sessoes recentes</h2>
        {sessoes.length === 0 ? (
          <div className="mt-3">
            <EstadoVazio
              icone="tutor"
              titulo="Ainda nao ha sessoes"
              descricao="Quando os alunos comecarem a conversar com o tutor, as sessoes aparecem aqui."
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {sessoes.map((s) => (
              <li key={s.sessaoId} className="cartao">
                <Link
                  href={`/professor/sessao/${s.sessaoId}`}
                  className="flex items-center justify-between p-3.5 transition hover:bg-roxo-suave/40"
                >
                  <span className="font-medium text-grafite">{s.aluno} — {s.perguntas} pergunta(s)</span>
                  <span className="text-xs text-slate-400">{s.iniciada}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </LayoutApp>
  );
}
