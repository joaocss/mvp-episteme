import { exigirPapel } from "../../../lib/sessaoServidor";
import { LayoutApp } from "../../componentes/LayoutApp";
import { CabecalhoPagina } from "../../componentes/ui/CabecalhoPagina";
import { variantesBotao } from "../../componentes/ui/Botao";
import ImportarAlunos from "./ImportarAlunos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaginaDadosAlunos() {
  const sessao = await exigirPapel(["gestor", "admin"]);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina
        titulo="Dados dos alunos"
        subtitulo="Importe alunos em lote por planilha e baixe os dados cadastrais. O download e restrito ao diretor e fica registrado na auditoria."
      />

      <div className="mt-6 space-y-6">
        <section className="cartao p-5">
          <h2 className="text-lg font-semibold text-grafite">Baixar dados (CSV)</h2>
          <p className="mt-1 text-sm text-slate-500">Exporta nome, e-mail, turma, data de nascimento e dados da familia.</p>
          <a href="/api/gestor/alunos/export" className={variantesBotao({ variante: "primario", tamanho: "pequeno" }) + " mt-3"}>
            Baixar CSV dos alunos
          </a>
        </section>

        <ImportarAlunos />
      </div>
    </LayoutApp>
  );
}
