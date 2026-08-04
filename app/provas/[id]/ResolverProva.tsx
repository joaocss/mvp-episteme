"use client";

// Condutor "uma questao por vez", modelado em app/tutor/Tutor.tsx: cada resposta
// da API pode trazer acoes extras (feedback/gabarito/passo a passo) renderizadas
// como botoes, e so avanca quando o aluno pede a proxima questao.
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Botao } from "../../componentes/ui/Botao";
import { Selo } from "../../componentes/ui/Selo";
import DuvidaQuestao from "./DuvidaQuestao";

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

export default function ResolverProva() {
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

  const voltar = <Link href="/provas" className="text-sm text-roxo hover:underline">&larr; Voltar as provas</Link>;

  if (carregando) return <div>{voltar}<p className="mt-4 text-slate-500">Carregando…</p></div>;

  if (resultado) {
    return (
      <div>
        {voltar}
        <h1 className="mt-2 text-2xl font-bold text-grafite">Resultado — {resultado.titulo}</h1>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="cartao p-4 text-center"><p className="text-2xl font-bold text-sucesso">{resultado.totalAcertos}</p><p className="text-xs text-slate-500">Acertos</p></div>
          <div className="cartao p-4 text-center"><p className="text-2xl font-bold text-alerta">{resultado.totalErros}</p><p className="text-xs text-slate-500">Erros</p></div>
          <div className="cartao p-4 text-center"><p className="text-2xl font-bold text-roxo">{resultado.notaMedia}</p><p className="text-xs text-slate-500">Nota final</p></div>
        </div>

        <div className="mt-6 space-y-3">
          {resultado.questoes.map((q) => <ItemResultado key={q.id} questao={q} />)}
        </div>
      </div>
    );
  }

  if (!questao) {
    return <div>{voltar}<p className="mt-4 text-alerta">{erro || "Nao foi possivel carregar a prova."}</p></div>;
  }

  return (
    <div>
      {voltar}
      <p className="mt-2 text-sm text-slate-500">{questao.tituloProva} — Questao {questao.ordem} de {questao.numeroQuestoes}</p>
      <h1 className="mt-1 text-lg font-semibold text-grafite">{questao.enunciado}</h1>

      {erro && <p className="mt-3 text-sm text-alerta" role="alert">{erro}</p>}

      {!respondida ? (
        <div className="mt-4 space-y-3">
          {questao.tipo === "objetiva" ? (
            <div className="space-y-2">
              {questao.alternativas?.map((a) => (
                <label key={a.letra} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${
                  resposta === a.letra ? "border-roxo bg-roxo-suave" : "border-borda bg-white hover:bg-tela"}`}>
                  <input type="radio" name="alternativa" value={a.letra} checked={resposta === a.letra}
                    onChange={() => setResposta(a.letra)} className="h-4 w-4 accent-roxo" />
                  <span><span className="font-medium">{a.letra})</span> {a.texto}</span>
                </label>
              ))}
            </div>
          ) : (
            <>
              <textarea value={resposta} onChange={(e) => setResposta(e.target.value)} rows={5}
                placeholder="Escreva sua resposta…" className="campo min-h-[120px]" />
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
            <p className={respondida.correta ? "font-medium text-sucesso" : "font-medium text-alerta"}>
              {respondida.correta ? "Voce acertou!" : "Voce errou essa questao."}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {questao.tipo === "objetiva" ? (
              <>
                <Botao variante="secundario" tamanho="pequeno" onClick={pedirFeedback} disabled={acaoCarregando === "feedback"}>
                  {acaoCarregando === "feedback" ? "Gerando…" : "Feedback da Questao"}
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
            <div className="cartao space-y-2 p-3 text-sm text-slate-700">
              {feedback.nota !== undefined && <Selo cor="roxo">Nota: {feedback.nota}/10</Selo>}
              <div className="prose-tutor"><ReactMarkdown>{feedback.feedback}</ReactMarkdown></div>
              <DuvidaQuestao questaoId={questao.id} />
            </div>
          )}
          {gabarito && (
            <p className="cartao p-3 text-sm text-slate-700">
              <span className="font-medium">Gabarito:</span> {gabarito.gabarito}
              {gabarito.explicacao && <><br /><span className="font-medium">Explicacao:</span> {gabarito.explicacao}</>}
            </p>
          )}

          <Botao onClick={carregarProxima}>Proxima questao</Botao>
        </div>
      )}
    </div>
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
      setFeedback("Nao foi possivel gerar o feedback agora.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="cartao p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-grafite">Questao {questao.ordem} — {questao.tipo === "objetiva" ? "Objetiva" : "Dissertativa"}</p>
          <p className="mt-1 text-sm text-slate-600">{questao.enunciado}</p>
          <p className="mt-1 text-sm text-slate-500">Sua resposta: {questao.respostaAluno ?? "—"}</p>
        </div>
        <Selo
          cor={questao.tipo === "objetiva" ? (questao.correta ? "sucesso" : "alerta") : "dourado"}
          className="shrink-0"
        >
          {questao.tipo === "objetiva" ? (questao.correta ? "Correta" : "Incorreta") : `Nota ${questao.nota ?? "—"}`}
        </Selo>
      </div>

      {!aberto ? (
        <Botao tamanho="pequeno" variante="fantasma" className="mt-2" onClick={verFeedback}>Ver gabarito e feedback</Botao>
      ) : (
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          <p><span className="font-medium">Gabarito:</span> {questao.gabarito}</p>
          {carregando ? <p className="text-slate-500">Gerando feedback…</p> : feedback && (
            <>
              <div className="prose-tutor"><ReactMarkdown>{feedback}</ReactMarkdown></div>
              <DuvidaQuestao questaoId={questao.id} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
