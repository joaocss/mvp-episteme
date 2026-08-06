import { exigirPapel } from "../../../lib/sessaoServidor";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import AssistenteChat from "../../componentes/AssistenteChat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaAssistente() {
  const sessao = await exigirPapel(["professor", "gestor", "admin"]);
  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Assistente da escola"
        subtitulo="Tire duvidas sobre os documentos disponibilizados para a equipe (regimento, orientacoes, avisos)."
      />
      <div className="mt-6">
        <AssistenteChat />
      </div>
    </LayoutApp>
  );
}
