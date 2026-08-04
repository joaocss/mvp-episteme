import { exigirPapel } from "../../../lib/sessaoServidor";
import { LayoutApp } from "../../componentes/LayoutApp";
import ResolverProva from "./ResolverProva";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaProva() {
  const sessao = await exigirPapel(["aluno"]);
  return (
    <LayoutApp sessao={sessao}>
      <ResolverProva />
    </LayoutApp>
  );
}
