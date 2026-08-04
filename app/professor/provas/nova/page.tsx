import Link from "next/link";
import { exigirPapel } from "../../../../lib/sessaoServidor";
import { turmasDoProfessor } from "../../../../src/bd/provas";
import { LayoutApp } from "../../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../../componentes/ui/CabecalhoPagina";
import { EstadoVazio } from "../../../componentes/ui/EstadoVazio";
import ElaborarProva from "./ElaborarProva";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaNovaProva() {
  const sessao = await exigirPapel(["professor"]);
  const turmas = await turmasDoProfessor(sessao.escolaId, sessao.usuarioId);

  return (
    <LayoutApp sessao={sessao}>
      <Link href="/professor/provas" className="text-sm text-roxo hover:underline">&larr; Voltar as provas</Link>
      <div className="mt-2">
        <CabecalhoPagina
          titulo="Elaborar prova"
          subtitulo="A IA gera um rascunho de questoes com base no material da escola. Voce revisa e edita cada questao antes de publicar."
        />
      </div>

      <div className="mt-6">
        {turmas.length === 0 ? (
          <EstadoVazio icone="provas" titulo="Sem turmas para provas" descricao="Voce ainda nao leciona nenhuma turma. Fale com a gestao." />
        ) : (
          <ElaborarProva turmas={turmas} />
        )}
      </div>
    </LayoutApp>
  );
}
