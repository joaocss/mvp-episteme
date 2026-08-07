import { exigirPapel } from "../../../lib/sessaoServidor";
import { listarTurmas } from "../../../src/bd/gestao";
import { listarAvisosDaEscola } from "../../../src/bd/avisos";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import GestaoAvisos from "../../componentes/GestaoAvisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaAvisosGestor() {
  const sessao = await exigirPapel(["gestor", "admin"]);
  const [turmas, avisos] = await Promise.all([
    listarTurmas(sessao.escolaId),
    listarAvisosDaEscola(sessao.escolaId),
  ]);
  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina titulo="Comunicados" subtitulo="Publique avisos escolhendo quem recebe — no app (push) e por e-mail." />
      <div className="mt-6">
        <GestaoAvisos turmas={turmas.map((t) => ({ id: t.id, nome: t.nome }))} avisosIniciais={avisos} />
      </div>
    </LayoutApp>
  );
}
