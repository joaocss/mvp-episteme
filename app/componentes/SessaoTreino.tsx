"use client";

// Sessao de coaching do aluno num treino (Modo Treinador). O aluno escreve suas
// tentativas/duvidas e recebe PISTAS (nunca a resposta). Ao final, envia a
// resposta final + uma reflexao — tudo fica registrado como o processo dele.
import { useState, useRef, useEffect } from "react";
import { Cartao } from "./ui/Cartao";
import { Botao } from "./ui/Botao";
import { GrupoCampo, Entrada, AreaTexto } from "./ui/Campo";
import { Selo } from "./ui/Selo";
import { Icone } from "./ui/Icone";

interface Turno { autor: "aluno" | "ia"; tipo: string; conteudo: string }

export default function SessaoTreino({
  treino, sessaoIdInicial, historicoInicial, concluidoInicial, respostaInicial, reflexaoInicial,
}: {
  treino: { id: string; titulo: string; enunciado: string; objetivo: string | null };
  sessaoIdInicial: string | null;
  historicoInicial: Turno[];
  concluidoInicial: boolean;
  respostaInicial: string | null;
  reflexaoInicial: string | null;
}) {
  const [sessaoId, setSessaoId] = useState<string | null>(sessaoIdInicial);
  const [turnos, setTurnos] = useState<Turno[]>(historicoInicial);
  const [concluido, setConcluido] = useState(concluidoInicial);
  const [mensagem, setMensagem] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState("");

  const [respostaFinal, setRespostaFinal] = useState(respostaInicial ?? "");
  const [reflexao, setReflexao] = useState(reflexaoInicial ?? "");
  const [enviandoFim, setEnviandoFim] = useState(false);

  const fimRef = useRef<HTMLDivElement>(null);
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turnos, pensando]);

  const conversa = turnos.filter((t) => t.tipo === "tentativa" || t.tipo === "pista");

  async function pedirPista(e: React.FormEvent) {
    e.preventDefault();
    const texto = mensagem.trim();
    if (!texto || pensando || concluido) return;
    setErro("");
    setMensagem("");
    setTurnos((t) => [...t, { autor: "aluno", tipo: "tentativa", conteudo: texto }]);
    setPensando(true);
    try {
      const r = await fetch("/api/treino-sessao", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao: "orientar", treinoId: treino.id, mensagem: texto }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d.erro ?? "Falha ao gerar a pista."); return; }
      if (d.sessaoId) setSessaoId(d.sessaoId);
      setTurnos((t) => [...t, { autor: "ia", tipo: "pista", conteudo: d.pista ?? "" }]);
    } finally {
      setPensando(false);
    }
  }

  async function concluir(e: React.FormEvent) {
    e.preventDefault();
    if (!respostaFinal.trim() || enviandoFim) return;
    setErro("");
    setEnviandoFim(true);
    try {
      const r = await fetch("/api/treino-sessao", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao: "concluir", sessaoId, respostaFinal, reflexao }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d.erro ?? "Falha ao concluir."); return; }
      setConcluido(true);
    } finally {
      setEnviandoFim(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Enunciado */}
      <Cartao className="p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Desafio</h2>
        <p className="mt-2 whitespace-pre-wrap text-grafite">{treino.enunciado}</p>
        {treino.objetivo && <p className="mt-3 text-sm text-slate-500"><strong>Objetivo:</strong> {treino.objetivo}</p>}
      </Cartao>

      {/* Conversa com o treinador */}
      <Cartao className="flex flex-col p-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-roxo-suave text-roxo">
            <Icone nome="treino" className="h-4 w-4" />
          </span>
          <h2 className="font-semibold text-grafite">Treinador</h2>
          <span className="text-xs text-slate-400">dá pistas, nunca a resposta</span>
        </div>

        <div className="mt-4 space-y-3">
          {conversa.length === 0 && (
            <p className="text-sm text-slate-500">
              Comece escrevendo o que você já pensou ou onde travou. O treinador vai te dar uma pista para o próximo passo.
            </p>
          )}
          {conversa.map((t, i) => (
            <div key={i} className={t.autor === "aluno" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                t.autor === "aluno" ? "bg-roxo text-white" : "border border-roxo/20 bg-roxo-suave/40 text-grafite"}`}>
                <p className="whitespace-pre-wrap">{t.conteudo}</p>
              </div>
            </div>
          ))}
          {pensando && <p className="text-sm text-slate-400">O treinador está pensando numa boa pista…</p>}
          <div ref={fimRef} />
        </div>

        {!concluido && (
          <form onSubmit={pedirPista} className="mt-4 flex gap-2">
            <Entrada value={mensagem} onChange={(e) => setMensagem(e.target.value)}
              placeholder="Escreva sua tentativa ou dúvida…" disabled={pensando} />
            <Botao disabled={pensando || !mensagem.trim()}>Pedir pista</Botao>
          </form>
        )}
        {erro && <p className="mt-2 text-sm text-alerta">{erro}</p>}
      </Cartao>

      {/* Encerramento: resposta final + reflexao */}
      <Cartao className="p-5">
        {concluido ? (
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-sucesso">
              <Icone nome="verificado" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-grafite">Treino concluído</h2>
              <p className="mt-1 text-sm text-slate-500">Sua resposta e reflexão foram registradas. Bom trabalho!</p>
              {respostaFinal && <p className="mt-3 text-sm text-grafite"><strong>Sua resposta:</strong> {respostaFinal}</p>}
              {reflexao && <p className="mt-1 text-sm text-slate-600"><strong>Reflexão:</strong> {reflexao}</p>}
            </div>
          </div>
        ) : (
          <form onSubmit={concluir} className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-grafite">Quando chegar na resposta</h2>
              <Selo cor="dourado">passo final</Selo>
            </div>
            <GrupoCampo rotulo="Sua resposta final" dica="Escreva a resposta com as suas palavras.">
              <AreaTexto value={respostaFinal} onChange={(e) => setRespostaFinal(e.target.value)}
                placeholder="Ex.: cheguei em… porque…" />
            </GrupoCampo>
            <GrupoCampo rotulo="Como você chegou nela? (reflexão)" dica="O que te ajudou, onde travou, o que aprendeu.">
              <AreaTexto value={reflexao} onChange={(e) => setReflexao(e.target.value)}
                placeholder="Ex.: no começo tentei… depois percebi que…" />
            </GrupoCampo>
            <Botao disabled={enviandoFim || !respostaFinal.trim()}>
              {enviandoFim ? "Enviando…" : "Concluir treino"}
            </Botao>
          </form>
        )}
      </Cartao>
    </div>
  );
}
