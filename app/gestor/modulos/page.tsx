import { exigirPapel } from "../../../lib/sessaoServidor";
import { listarEstadoModulos } from "../../../src/bd/modulos";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import PainelModulos from "../../componentes/PainelModulos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaModulos() {
  const sessao = await exigirPapel(["gestor", "admin"]);
  const modulos = await listarEstadoModulos(sessao.escolaId);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Modulos da escola"
        subtitulo="Ligue ou desligue funcionalidades opcionais. As essenciais (tutor, cadastros, seguranca) ficam sempre ativas."
      />
      <div className="mt-6">
        <PainelModulos modulosIniciais={modulos} />
      </div>
    </LayoutApp>
  );
}
