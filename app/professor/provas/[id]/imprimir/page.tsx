import { notFound } from "next/navigation";
import { exigirPapel } from "../../../../../lib/sessaoServidor";
import { obterProvaComQuestoes } from "../../../../../src/bd/provas";
import { obterConfigEscola } from "../../../../../src/bd/configEscola";
import BarraImpressao from "../../../../componentes/BarraImpressao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Folha de impressao de prova (SO o professor dono acessa — obterProvaComQuestoes
// filtra por professor_id). Layout standalone (sem o shell do app), otimizado
// para impressao/PDF. Alternador com/sem gabarito via querystring.
export default async function PaginaImprimirProva({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gabarito?: string }>;
}) {
  const { id } = await params;
  const { gabarito } = await searchParams;
  const comGabarito = gabarito === "1";
  const sessao = await exigirPapel(["professor", "admin"]);

  const [prova, config] = await Promise.all([
    obterProvaComQuestoes(sessao.escolaId, sessao.usuarioId, id),
    obterConfigEscola(sessao.escolaId),
  ]);
  if (!prova) notFound();

  return (
    <div className="min-h-screen bg-tela">
      <BarraImpressao provaId={id} comGabarito={comGabarito} />

      <style>{`
        @page { margin: 18mm 16mm; }
        @media print {
          .barra-impressao { display: none !important; }
          .folha { box-shadow: none !important; margin: 0 !important; max-width: none !important; }
          body { background: #fff !important; }
        }
        .questao { break-inside: avoid; page-break-inside: avoid; }
        .linhas-resposta { background-image: repeating-linear-gradient(#fff, #fff 27px, #cbd0da 28px); }
      `}</style>

      <div className="folha mx-auto my-6 max-w-[820px] bg-white p-10 shadow-cartao print:my-0">
        {/* Cabecalho */}
        <header className="border-b-2 border-grafite pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {config.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.logoUrl} alt="" className="h-12 w-12 object-contain" />
              )}
              <div>
                <p className="text-lg font-bold text-grafite">{config.nome || "Escola"}</p>
                <p className="text-sm text-slate-500">{prova.turma}</p>
              </div>
            </div>
            {comGabarito && (
              <span className="rounded-md border border-alerta px-2 py-1 text-xs font-bold uppercase text-alerta">
                Gabarito do professor
              </span>
            )}
          </div>
          <h1 className="mt-4 text-xl font-bold text-grafite">{prova.titulo}</h1>
          {prova.assunto && <p className="text-sm text-slate-600">Assunto: {prova.assunto}</p>}
          {!comGabarito && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-grafite">
              <p>Nome: __________________________________________</p>
              <p>Data: _______ / _______ / __________</p>
              <p>Turma: {prova.turma}</p>
              <p>Nota: _____________</p>
            </div>
          )}
        </header>

        {/* Questoes */}
        <ol className="mt-6 space-y-6">
          {prova.questoes.map((q) => (
            <li key={q.id} className="questao">
              <p className="font-medium text-grafite">
                <span className="mr-1 font-bold">{q.ordem}.</span>
                <span className="whitespace-pre-wrap">{q.enunciado}</span>
              </p>

              {q.tipo === "objetiva" && q.alternativas && q.alternativas.length > 0 ? (
                <ul className="mt-2 space-y-1.5 pl-1">
                  {q.alternativas.map((a) => {
                    const correta = comGabarito && a.letra.toUpperCase() === q.gabarito.toUpperCase();
                    return (
                      <li key={a.letra} className={`flex items-start gap-2 text-sm ${correta ? "font-semibold text-sucesso" : "text-grafite"}`}>
                        <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${correta ? "border-sucesso bg-green-50" : "border-slate-400"}`}>
                          {a.letra}
                        </span>
                        <span className="whitespace-pre-wrap">{a.texto}</span>
                        {correta && <span className="ml-1 text-xs">(correta)</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                // Dissertativa: espaco pautado para resposta (ou gabarito).
                !comGabarito && <div className="linhas-resposta mt-3 h-40 rounded border border-borda" aria-hidden />
              )}

              {comGabarito && (
                <div className="mt-2 rounded-md border border-borda bg-tela p-3 text-sm">
                  {q.tipo === "dissertativa" && (
                    <p className="text-grafite"><strong>Gabarito:</strong> <span className="whitespace-pre-wrap">{q.gabarito}</span></p>
                  )}
                  {q.explicacao && <p className="mt-1 text-slate-600"><strong>Explicação:</strong> <span className="whitespace-pre-wrap">{q.explicacao}</span></p>}
                </div>
              )}
            </li>
          ))}
        </ol>

        {prova.questoes.length === 0 && (
          <p className="mt-6 text-sm text-slate-500">Esta prova ainda não tem questões.</p>
        )}
      </div>
    </div>
  );
}
