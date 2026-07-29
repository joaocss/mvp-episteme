"use client";

// Condutor "uma questao por vez", modelado em app/tutor/page.tsx: cada resposta
// da API pode trazer acoes extras (feedback/gabarito/passo a passo) renderizadas
// como botoes, e so avanca quando o aluno pede a proxima questao.
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Botao } from "../../componentes/ui/Botao";

type TipoQuestao = "objetiva" | "dissertativa";
interface Alternativa { letra: string; texto: string; }
interface Questao {
  id: string; ordem: number; tipo: TipoQuestao; enunciado: string; alternativas: Alternativa[] | null;
  numeroQuestoes: number; tituloProva: string;
}
interface QuestaoResultado {
  id: string; ordem: number; tipo: TipoQuestao; enunciado: string;
  respostaAluno: string | null; correta: boolean | null; nota: number | null;
  gabarito: string; explicacao: string | null; feedbackIa: string | null;
}
interface ResultadoProva { titulo: string; totalAcertos: number; totalErros: number; notaMedia: number; questoes: QuestaoResultado[]; }

async function chamar(acao: string, dados: Record<string, unknown> = {}) {
  const r = await fetch("/api/provas", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ acao, ...dados }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.erro ?? "Falha ao processar.");
  return d;
}

export default function PaginaProva() {
  const { id: provaId } = useParams<{ id: string }>();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [questao, setQuestao] = useState<Questao | null>(null);
  const [resultado, setResultado] = useState<ResultadoProva | null>(null);

  const [resposta, setResposta] = useState("");
  const [respondida, setRespondida] = useState<{ correta: boolean | null } | null>(null);
  const [dica, setDica] = useState("");
  const [gabarito, setGabarito] = useState<{ gabarito: string; explicacao: string | null } | null>(null);
  const [feedback, setFeedback] = useState<{ nota?: number; feedback?: string } | null>(null);
  const [acaoCarregando, setAcaoCarregando] = useState("");

  async function carregarProxima() {
    setCarregando(true); setErro(""); setResposta(""); setRespondida(null); setDica(""); setGabarito(null); setFeedback(null);
    try {
      const d = await chamar("proxima-questao", { provaId });
      if (d.questao) {
        setQuestao(d.questao);
      } else {
        setQuestao(null);
        const r = await chamar("resultado", { provaId });
        setResultado(r.resultado);
      }
    } catch (e: any) {
      setErro(e.message ?? "Falha ao carregar a prova.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregarProxima(); }, [provaId]);

  async function responder() {
    if (!questao || !resposta.trim()) return;
    setAcaoCarregando("responder"); setErro("");
    try {
      const r = await chamar("responder", { questaoId: questao.id, resposta });
      setRespondida({ correta: r.correta });
    } catch (e: any) {
      setErro(e.message ?? "Falha ao registrar a resposta.");
    } finally {
      setAcaoCarregando("");
    }
  }

  async function pedirPassoAPasso() {
    if (!questao) return;
    setAcaoCarregando("passo"); setErro("");
    try {
      const d = await chamar("passo-a-passo", { questaoId: questao.id });
      setDica(d.dica ?? "");
    } catch (e: any) {
      setErro(e.message ?? "Falha ao gerar a dica.");
    } finally {
      setAcaoCarregando("");
    }
  }

  async function pedirGabarito() {
    if (!questao) return;
    setAcaoCarregando("gabarito"); setErro("");
    try {
      const d = await chamar("gabarito", { questaoId: questao.id });
      setGabarito(d);
    } catch (e: any) {
      setErro(e.message ?? "Falha ao consultar o gabarito.");
    } finally {
      setAcaoCarregando("");
    }
  }

  async function pedirFeedback() {
    if (!questao) return;
    setAcaoCarregando("feedback"); setErro("");
    try {
      const acao = questao.tipo === "objetiva" ? "feedback-questao" : "feedback-resposta";
      const d = await chamar(acao, { questaoId: questao.id, resposta });
      setFeedback(d);
    } catch (e: any) {
      setErro(e.message ?? "Falha ao gerar o feedback.");
    } finally {
      setAcaoCarregando("");
    }
  }

  if (carregando) return <main className="mx-auto max-w-2xl p-6"><p className="text-slate-500">Carregando…</p></main>;

  if (resultado) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Link href="/provas" className="text-sm text-roxo hover:underline">← Voltar às provas</Link>
        <h1 className="mt-2 text-2xl font-bold text-grafite">Resultado — {resultado.titulo}</h1>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="cartao p-4 text-center"><p className="text-2xl font-bold text-green-700">{resultado.totalAcertos}</p><p className="text-xs text-slate-500">Acertos</p></div>
          <div className="cartao p-4 text-center"><p className="text-2xl font-bold text-alerta">{resultado.totalErros}</p><p className="text-xs text-slate-500">Erros</p></div>
          <div className="cartao p-4 text-center"><p className="text-2xl font-bold text-roxo">{resultado.notaMedia}</p><p className="text-xs text-slate-500">Nota final</p></div>
        </div>

        <div className="mt-6 space-y-3">
          {resultado.questoes.map((q) => <ItemResultado key={q.id} questao={q} />)}
        </div>
      </main>
    );
  }

  if (!questao) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Link href="/provas" className="text-sm text-roxo hover:underline">← Voltar às provas</Link>
        <p className="mt-4 text-alerta">{erro || "Não foi possível carregar a prova."}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/provas" className="text-sm text-roxo hover:underline">← Voltar às provas</Link>
      <p className="mt-2 text-sm text-slate-500">{questao.tituloProva} — Questão {questao.ordem} de {questao.numeroQuestoes}</p>
      <h1 className="mt-1 text-lg font-semibold text-grafite">{questao.enunciado}</h1>

      {erro && <p className="mt-3 text-sm text-alerta" role="alert">{erro}</p>}

      {!respondida ? (
        <div className="mt-4 space-y-3">
          {questao.tipo === "objetiva" ? (
            <div className="space-y-2">
              {questao.alternativas?.map((a) => (
                <label key={a.letra} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
                  resposta === a.letra ? "border-roxo bg-creme" : "border-slate-200 bg-white"}`}>
                  <input type="radio" name="alternativa" value={a.letra} checked={resposta === a.letra}
                    onChange={() => setResposta(a.letra)} className="h-4 w-4" />
                  <span><span className="font-medium">{a.letra})</span> {a.texto}</span>
                </label>
              ))}
            </div>
          ) : (
            <>
              <textarea value={resposta} onChange={(e) => setResposta(e.target.value)} rows={5}
                placeholder="Escreva sua resposta…"
                className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-roxo-claro" />
              <Botao variante="secundario" tamanho="pequeno" onClick={pedirPassoAPasso} disabled={acaoCarregando === "passo"}>
                {acaoCarregando === "passo" ? "Pensando…" : "Ver Passo a Passo"}
              </Botao>
              {dica && <p className="cartao p-3 text-sm text-slate-700">{dica}</p>}
            </>
          )}
          <Botao onClick={responder} disabled={!resposta.trim() || acaoCarregando === "responder"}>
            {acaoCarregando === "responder" ? "Enviando…" : "Responder"}
          </Botao>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {questao.tipo === "objetiva" && (
            <p className={respondida.correta ? "font-medium text-green-700" : "font-medium text-alerta"}>
              {respondida.correta ? "Você acertou!" : "Você errou essa questão."}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {questao.tipo === "objetiva" ? (
              <>
                <Botao variante="secundario" tamanho="pequeno" onClick={pedirFeedback} disabled={acaoCarregando === "feedback"}>
                  {acaoCarregando === "feedback" ? "Gerando…" : "Feedback da Questão"}
                </Botao>
                <Botao variante="secundario" tamanho="pequeno" onClick={pedirGabarito} disabled={acaoCarregando === "gabarito"}>
                  {acaoCarregando === "gabarito" ? "Consultando…" : "Consultar Gabarito"}
                </Botao>
              </>
            ) : (
              <Botao variante="secundario" tamanho="pequeno" onClick={pedirFeedback} disabled={acaoCarregando === "feedback"}>
                {acaoCarregando === "feedback" ? "Corrigindo…" : "Feedback da Resposta"}
              </Botao>
            )}
          </div>

          {feedback?.feedback && (
            <p className="cartao p-3 text-sm text-slate-700">
              {feedback.nota !== undefined && <span className="mb-1 block font-medium text-roxo">Nota: {feedback.nota}/10</span>}
              {feedback.feedback}
            </p>
          )}
          {gabarito && (
            <p className="cartao p-3 text-sm text-slate-700">
              <span className="font-medium">Gabarito:</span> {gabarito.gabarito}
              {gabarito.explicacao && <><br /><span className="font-medium">Explicação:</span> {gabarito.explicacao}</>}
            </p>
          )}

          <Botao onClick={carregarProxima}>Próxima questão</Botao>
        </div>
      )}
    </main>
  );
}

function ItemResultado({ questao }: { questao: QuestaoResultado }) {
  const [aberto, setAberto] = useState(false);
  const [feedback, setFeedback] = useState(questao.feedbackIa);
  const [carregando, setCarregando] = useState(false);

  async function verFeedback() {
    setAberto(true);
    if (feedback) return;
    setCarregando(true);
    try {
      const acao = questao.tipo === "objetiva" ? "feedback-questao" : "feedback-resposta";
      const d = await chamar(acao, { questaoId: questao.id, resposta: questao.respostaAluno ?? "" });
      setFeedback(d.feedback ?? null);
    } catch {
      setFeedback("Não foi possível gerar o feedback agora.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="cartao p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-grafite">Questão {questao.ordem} — {questao.tipo === "objetiva" ? "Objetiva" : "Dissertativa"}</p>
          <p className="mt-1 text-sm text-slate-600">{questao.enunciado}</p>
          <p className="mt-1 text-sm text-slate-500">Sua resposta: {questao.respostaAluno ?? "—"}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
          questao.tipo === "objetiva"
            ? (questao.correta ? "bg-green-100 text-green-800" : "bg-red-100 text-alerta")
            : "bg-creme text-roxo"}`}>
          {questao.tipo === "objetiva" ? (questao.correta ? "Correta" : "Incorreta") : `Nota ${questao.nota ?? "—"}`}
        </span>
      </div>

      {!aberto ? (
        <Botao tamanho="pequeno" variante="fantasma" className="mt-2" onClick={verFeedback}>Ver gabarito e feedback</Botao>
      ) : (
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          <p><span className="font-medium">Gabarito:</span> {questao.gabarito}</p>
          {carregando ? <p className="text-slate-500">Gerando feedback…</p> : feedback && <p>{feedback}</p>}
        </div>
      )}
    </div>
  );
}
