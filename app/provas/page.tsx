import Link from "next/link";
import { exigirPapel } from "../../lib/sessaoServidor";
import { listarProvasDisponiveis } from "../../src/bd/provas";
import { LayoutApp } from "../componentes/LayoutApp";
import { CabecalhoPagina } from "../componentes/ui/CabecalhoPagina";
import { Selo } from "../componentes/ui/Selo";
import { EstadoVazio } from "../componentes/ui/EstadoVazio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaProvasAluno() {
  const sessao = await exigirPapel(["aluno"]);
  const provas = await listarProvasDisponiveis(sessao.escolaId, sessao.usuarioId);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Provas"
        subtitulo="Responda uma questao por vez. Voce pode pedir dicas e feedback da IA a qualquer momento."
      />

      <section className="mt-6">
        {provas.length === 0 ? (
          <EstadoVazio icone="provas" titulo="Nenhuma prova disponivel" descricao="Quando o professor publicar uma prova, ela aparece aqui." />
        ) : (
          <ul className="space-y-2">
            {provas.map((p) => {
              const concluida = p.respondidas >= p.numeroQuestoes;
              return (
                <li key={p.id} className="cartao">
                  <Link href={`/provas/${p.id}`} className="flex items-center justify-between p-3.5 transition hover:bg-roxo-suave/40">
                    <div>
                      <span className="font-medium text-grafite">{p.titulo}</span>
                      <span className="ml-2 text-sm text-slate-500">{p.turma} — {p.assunto}</span>
                    </div>
                    <Selo cor={concluida ? "sucesso" : "dourado"}>
                      {p.respondidas}/{p.numeroQuestoes} {concluida ? "concluida" : "respondidas"}
                    </Selo>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </LayoutApp>
  );
}
