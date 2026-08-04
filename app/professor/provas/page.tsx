import Link from "next/link";
import { exigirPapel } from "../../../lib/sessaoServidor";
import { listarProvasProfessor } from "../../../src/bd/provas";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import { Selo } from "../../componentes/ui/Selo";
import { EstadoVazio } from "../../componentes/ui/EstadoVazio";
import { variantesBotao } from "../../componentes/ui/Botao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROTULO_STATUS: Record<string, string> = {
  rascunho: "Rascunho", publicada: "Publicada", encerrada: "Encerrada",
};
const COR_STATUS: Record<string, "dourado" | "sucesso" | "neutro"> = {
  rascunho: "dourado", publicada: "sucesso", encerrada: "neutro",
};

export default async function PaginaProvas() {
  const sessao = await exigirPapel(["professor"]);
  const provas = await listarProvasProfessor(sessao.escolaId, sessao.usuarioId);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Provas"
        subtitulo="Gere questoes com IA ancoradas no material da escola, revise e publique para a turma."
        acoes={
          <Link href="/professor/provas/nova" className={variantesBotao({ variante: "primario", tamanho: "pequeno" })}>
            Elaborar prova
          </Link>
        }
      />

      <section className="mt-6">
        {provas.length === 0 ? (
          <EstadoVazio
            icone="provas"
            titulo="Nenhuma prova criada ainda"
            descricao="Crie sua primeira prova com apoio da IA, ancorada no material da turma."
            acao={
              <Link href="/professor/provas/nova" className={variantesBotao({ variante: "primario", tamanho: "pequeno" })}>
                Elaborar prova
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2">
            {provas.map((p) => (
              <li key={p.id} className="cartao">
                <Link href={`/professor/provas/${p.id}`} className="flex items-center justify-between p-3.5 transition hover:bg-roxo-suave/40">
                  <div>
                    <span className="font-medium text-grafite">{p.titulo}</span>
                    <span className="ml-2 text-sm text-slate-500">{p.turma} — {p.numeroQuestoes} questao(oes)</span>
                  </div>
                  <Selo cor={COR_STATUS[p.status]}>{ROTULO_STATUS[p.status]}</Selo>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </LayoutApp>
  );
}
