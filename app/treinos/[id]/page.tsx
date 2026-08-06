import { notFound } from "next/navigation";
import { exigirPapel } from "../../../lib/sessaoServidor";
import { turmaDoAluno } from "../../../src/bd/aluno";
import {
  obterTreinoPublicadoDaTurma, sessaoPorTreino, historicoTreino,
} from "../../../src/bd/treinos";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import SessaoTreino from "../../componentes/SessaoTreino";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaSessaoTreino({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await exigirPapel(["aluno"]);
  const turma = await turmaDoAluno(sessao.escolaId, sessao.usuarioId);
  if (!turma) notFound();

  const treino = await obterTreinoPublicadoDaTurma(sessao.escolaId, id, turma.turmaId);
  if (!treino) notFound();

  const sessaoTreino = await sessaoPorTreino(sessao.escolaId, id, sessao.usuarioId);
  const historico = sessaoTreino ? await historicoTreino(sessao.escolaId, sessaoTreino.id) : [];

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina titulo={treino.titulo} subtitulo="A IA te ajuda a chegar na resposta com pistas — sem entregar." />
      <div className="mt-6">
        <SessaoTreino
          treino={{ id: treino.id, titulo: treino.titulo, enunciado: treino.enunciado, objetivo: treino.objetivo }}
          sessaoIdInicial={sessaoTreino?.id ?? null}
          historicoInicial={historico.map((h) => ({ autor: h.autor, tipo: h.tipo, conteudo: h.conteudo }))}
          concluidoInicial={sessaoTreino?.status === "concluido"}
          respostaInicial={sessaoTreino?.respostaFinal ?? null}
          reflexaoInicial={sessaoTreino?.reflexao ?? null}
        />
      </div>
    </LayoutApp>
  );
}
