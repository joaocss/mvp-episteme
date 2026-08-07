import { exigirPapel } from "../../lib/sessaoServidor";
import { turmaDoAluno } from "../../src/bd/aluno";
import { listarAvisosParaUsuario } from "../../src/bd/avisos";
import { LayoutApp } from "../componentes/LayoutApp";
import { CabecalhoPagina } from "../componentes/ui/CabecalhoPagina";
import { Cartao } from "../componentes/ui/Cartao";
import { Selo } from "../componentes/ui/Selo";
import { EstadoVazio } from "../componentes/ui/EstadoVazio";
import AtivarNotificacoes from "../componentes/AtivarNotificacoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Avisos que o usuario logado deve ver (por audiencia). Aberto a todos os papeis.
export default async function PaginaAvisos() {
  const sessao = await exigirPapel(["aluno", "professor", "gestor", "admin", "responsavel"]);
  const turmaId = sessao.papel === "aluno"
    ? (await turmaDoAluno(sessao.escolaId, sessao.usuarioId))?.turmaId ?? null
    : null;
  const avisos = await listarAvisosParaUsuario(sessao.escolaId, sessao.papel, turmaId);

  return (
    <LayoutApp sessao={sessao}>
      <CabecalhoPagina titulo="Avisos" subtitulo="Comunicados da escola direcionados a você." acoes={<AtivarNotificacoes />} />
      <div className="mt-6">
        {avisos.length === 0 ? (
          <EstadoVazio icone="logs" titulo="Nenhum aviso" descricao="Quando a escola publicar um comunicado para você, ele aparece aqui." />
        ) : (
          <ul className="space-y-3">
            {avisos.map((a) => (
              <Cartao key={a.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-grafite">{a.titulo}</h3>
                  <span className="text-xs text-slate-400">{new Date(a.criadoEm).toLocaleString("pt-BR")}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{a.corpo}</p>
                {(a.autorNome || a.turmaNome) && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {a.turmaNome && <Selo cor="dourado">{a.turmaNome}</Selo>}
                    {a.autorNome && <span className="text-xs text-slate-400">por {a.autorNome}</span>}
                  </div>
                )}
              </Cartao>
            ))}
          </ul>
        )}
      </div>
    </LayoutApp>
  );
}
