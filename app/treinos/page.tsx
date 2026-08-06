import Link from "next/link";
import { exigirPapel } from "../../lib/sessaoServidor";
import { turmaDoAluno } from "../../src/bd/aluno";
import { listarTreinosDaTurma } from "../../src/bd/treinos";
import { LayoutApp } from "../componentes/LayoutApp";
import { CabecalhoPagina } from "../componentes/ui/CabecalhoPagina";
import { Cartao } from "../componentes/ui/Cartao";
import { Selo } from "../componentes/ui/Selo";
import { Icone } from "../componentes/ui/Icone";
import { EstadoVazio } from "../componentes/ui/EstadoVazio";
import AtivarNotificacoes from "../componentes/AtivarNotificacoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaTreinosAluno() {
  const sessao = await exigirPapel(["aluno"]);
  const turma = await turmaDoAluno(sessao.escolaId, sessao.usuarioId);
  const treinos = turma ? await listarTreinosDaTurma(sessao.escolaId, turma.turmaId, sessao.usuarioId) : [];

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Treinos"
        subtitulo="Desafios da sua turma. Aqui a IA nao entrega a resposta: ela te ajuda a chegar la com pistas."
        acoes={<AtivarNotificacoes />}
      />
      <div className="mt-6">
        {treinos.length === 0 ? (
          <EstadoVazio icone="treino" titulo="Nenhum treino disponivel" descricao="Quando o professor publicar um desafio, ele aparece aqui." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {treinos.map((t) => (
              <Link key={t.id} href={`/treinos/${t.id}`}>
                <Cartao className="flex h-full items-start gap-4 p-4 transition hover:border-roxo/30 hover:shadow-elevado">
                  <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-roxo-suave text-roxo">
                    <Icone nome="treino" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-grafite">{t.titulo}</h3>
                      {t.sessaoStatus === "concluido" && <Selo cor="sucesso">Concluido</Selo>}
                      {t.sessaoStatus === "em_andamento" && <Selo cor="aviso">Em andamento</Selo>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{t.enunciado}</p>
                  </div>
                </Cartao>
              </Link>
            ))}
          </div>
        )}
      </div>
    </LayoutApp>
  );
}
