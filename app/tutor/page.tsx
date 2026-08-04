import { exigirPapel } from "../../lib/sessaoServidor";
import { LayoutApp } from "../componentes/LayoutApp";
import Tutor from "./Tutor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaTutor() {
  const sessao = await exigirPapel(["aluno"]);
  return (
    <LayoutApp sessao={sessao}>
      <Tutor />
    </LayoutApp>
  );
}
