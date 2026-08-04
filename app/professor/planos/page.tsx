import Link from "next/link";
import { exigirPapel } from "../../../lib/sessaoServidor";
import { listarPlanosEnsino } from "../../../src/rag/planejamento";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import { EstadoVazio } from "../../componentes/ui/EstadoVazio";
import GeradorPlano from "./GeradorPlano";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaPlanos() {
  const sessao = await exigirPapel(["professor"]);
  const planos = await listarPlanosEnsino(sessao.usuarioId);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Planejamento — Plano de Ensino"
        subtitulo="Gera um plano de ensino com base no material da turma, na BNCC e no perfil dos alunos (incluindo alunos atipicos)."
      />

      <div className="mt-6"><GeradorPlano /></div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-grafite">Planos salvos</h2>
        {planos.length === 0 ? (
          <div className="mt-3">
            <EstadoVazio icone="planos" titulo="Nenhum plano gerado ainda" descricao="Gere um plano de ensino acima; os planos salvos ficam listados aqui." />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {planos.map((p) => (
              <li key={p.id} className="cartao">
                <Link href={`/professor/planos/${p.id}`} className="flex items-center justify-between p-3.5 transition hover:bg-roxo-suave/40">
                  <span>{p.disciplina} — {p.turma} ({p.anoLetivo})</span>
                  <span className="text-xs text-slate-400">{p.criadoEm}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </LayoutApp>
  );
}
