"use client";

import { useEffect, useRef, useState } from "react";
import { Marca } from "../componentes/Marca";

interface Mensagem {
  autor: "aluno" | "tutor";
  texto: string;
  opcoes?: string[];
}

interface ResumoSessao { sessaoId: string; perguntas: number; iniciada: string; }

export default function PaginaTutor() {
  const [pergunta, setPergunta] = useState("");
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [temaQuestoes, setTemaQuestoes] = useState<string>("");
  const [historico, setHistorico] = useState<ResumoSessao[]>([]);
  const fimDaConversa = useRef<HTMLDivElement>(null);

  useEffect(() => { fimDaConversa.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens]);

  async function carregarHistorico() {
    try {
      const r = await fetch("/api/tutor/historico");
      if (r.ok) { const d = await r.json(); setHistorico(d.sessoes ?? []); }
    } catch { /* silencioso */ }
  }
  useEffect(() => { carregarHistorico(); }, []);

  async function abrirSessao(id: string) {
    try {
      const r = await fetch(`/api/tutor/conversa?sessao=${id}`);
      if (!r.ok) return;
      const d = await r.json();
      setMensagens((d.mensagens ?? []).map((m: { autor: string; conteudo: string }) => ({
        autor: m.autor === "aluno" ? "aluno" : "tutor", texto: m.conteudo,
      })));
      setSessaoId(id);
    } catch { /* silencioso */ }
  }

  function novaConversa() { setMensagens([]); setSessaoId(null); setPergunta(""); setTemaQuestoes(""); }

  async function enviarPergunta(texto: string) {
    const limpo = texto.trim();
    if (!limpo || carregando) return;
    setMensagens((atual) => [...atual, { autor: "aluno", texto: limpo }]);
    setPergunta("");
    setCarregando(true);
    try {
      const resposta = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pergunta: limpo, sessaoId }),
      });
      const dados = await resposta.json();
      if (dados.sessaoId) setSessaoId(dados.sessaoId);
      if (dados.tema) setTemaQuestoes(dados.tema);
      setMensagens((atual) => [...atual, {
        autor: "tutor",
        texto: dados.resposta ?? "Não consegui responder agora.",
        opcoes: dados.opcoes,
      }]);
      carregarHistorico();
    } catch {
      setMensagens((atual) => [...atual, { autor: "tutor", texto: "Tive um problema para responder. Tente novamente." }]);
    } finally {
      setCarregando(false);
    }
  }

  function escolherFormato(opcao: string) {
    enviarPergunta(`${temaQuestoes} — ${opcao}`);
  }

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col bg-creme p-4">
      <Marca
        compacto
        acoes={
          <>
            <button onClick={novaConversa} className="min-h-[44px] text-sm font-medium text-roxo hover:underline">
              Nova conversa
            </button>
            <form action="/auth/sair" method="post">
              <button type="submit" className="min-h-[44px] text-sm text-slate-500 hover:text-grafite">Sair</button>
            </form>
          </>
        }
      />

      <h1 className="mt-3 text-lg font-bold text-grafite">Tutor de Matemática — 6º ano</h1>

      {historico.length > 0 && (
        <details className="mt-3 cartao p-2">
          <summary className="cursor-pointer text-sm text-slate-600">Conversas anteriores ({historico.length})</summary>
          <ul className="mt-2 space-y-1">
            {historico.map((s) => (
              <li key={s.sessaoId}>
                <button onClick={() => abrirSessao(s.sessaoId)}
                  className="w-full rounded px-2 py-2 text-left text-sm hover:bg-creme">
                  {s.iniciada} — {s.perguntas} pergunta(s)
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className="mt-4 flex-1 space-y-3 overflow-y-auto cartao p-4"
        role="log" aria-live="polite" aria-label="Conversa com o tutor">
        {mensagens.length === 0 && <p className="text-slate-500">Escreva uma dúvida de matemática para começar.</p>}
        {mensagens.map((m, i) => (
          <div key={i} className={m.autor === "aluno" ? "text-right" : "text-left"}>
            <span className={`inline-block max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 ${
              m.autor === "aluno" ? "bg-roxo text-white" : "border border-slate-200 bg-slate-50 text-grafite"}`}>
              {m.texto}
            </span>
            {m.opcoes && m.opcoes.length > 0 && !carregando && (
              <div className="mt-2 flex flex-wrap gap-2">
                {m.opcoes.map((op) => (
                  <button key={op} onClick={() => escolherFormato(op)}
                    className="min-h-[44px] rounded-full border border-roxo/30 bg-white px-4 py-1 text-sm text-roxo hover:bg-creme">
                    {op}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {carregando && <p className="text-slate-500" aria-live="assertive">Pensando…</p>}
        <div ref={fimDaConversa} />
      </section>

      <form onSubmit={(e) => { e.preventDefault(); enviarPergunta(pergunta); }} className="mt-4 flex gap-2">
        <label htmlFor="campo-pergunta" className="sr-only">Sua pergunta de matemática</label>
        <input id="campo-pergunta" value={pergunta} onChange={(e) => setPergunta(e.target.value)}
          placeholder="Escreva sua dúvida…" autoComplete="off"
          className="min-h-[44px] flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roxo-claro" />
        <button type="submit" disabled={carregando} className="btn-primario">Enviar</button>
      </form>
    </main>
  );
}
