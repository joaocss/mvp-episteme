"use client";

import { useEffect, useRef, useState } from "react";

interface Mensagem {
  autor: "aluno" | "tutor";
  texto: string;
  fontes?: string[];
}

interface ResumoSessao { sessaoId: string; perguntas: number; iniciada: string; }

export default function PaginaTutor() {
  const [pergunta, setPergunta] = useState("");
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [historico, setHistorico] = useState<ResumoSessao[]>([]);
  const fimDaConversa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimDaConversa.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function carregarHistorico() {
    try {
      const r = await fetch("/api/tutor/historico");
      if (r.ok) {
        const d = await r.json();
        setHistorico(d.sessoes ?? []);
      }
    } catch {
      /* silencioso */
    }
  }

  useEffect(() => {
    carregarHistorico();
  }, []);

  async function abrirSessao(id: string) {
    try {
      const r = await fetch(`/api/tutor/conversa?sessao=${id}`);
      if (!r.ok) return;
      const d = await r.json();
      const msgs: Mensagem[] = (d.mensagens ?? []).map((m: { autor: string; conteudo: string }) => ({
        autor: m.autor === "aluno" ? "aluno" : "tutor",
        texto: m.conteudo,
      }));
      setMensagens(msgs);
      setSessaoId(id);
    } catch {
      /* silencioso */
    }
  }

  function novaConversa() {
    setMensagens([]);
    setSessaoId(null);
    setPergunta("");
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const texto = pergunta.trim();
    if (!texto || carregando) return;

    setMensagens((atual) => [...atual, { autor: "aluno", texto }]);
    setPergunta("");
    setCarregando(true);

    try {
      const resposta = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pergunta: texto, sessaoId }),
      });
      const dados = await resposta.json();
      if (dados.sessaoId) setSessaoId(dados.sessaoId);
      const textoTutor = dados.resposta ?? "Não consegui responder agora.";
      setMensagens((atual) => [...atual, { autor: "tutor", texto: textoTutor }]);
      carregarHistorico();
    } catch {
      setMensagens((atual) => [
        ...atual,
        { autor: "tutor", texto: "Tive um problema para responder. Tente novamente." },
      ]);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tutor de Matemática — 6º ano</h1>
        <div className="flex items-center gap-4">
          <button onClick={novaConversa} className="text-sm text-blue-700 hover:underline">Nova conversa</button>
          <form action="/auth/sair" method="post">
            <button type="submit" className="text-sm text-slate-500 hover:text-slate-800">Sair</button>
          </form>
        </div>
      </header>

      {historico.length > 0 && (
        <details className="mt-3 rounded-md border border-slate-200 bg-white p-2">
          <summary className="cursor-pointer text-sm text-slate-600">Conversas anteriores ({historico.length})</summary>
          <ul className="mt-2 space-y-1">
            {historico.map((s) => (
              <li key={s.sessaoId}>
                <button
                  onClick={() => abrirSessao(s.sessaoId)}
                  className="w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-50"
                >
                  {s.iniciada} — {s.perguntas} pergunta(s)
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section
        className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-lg bg-white p-4 shadow-sm"
        role="log" aria-live="polite" aria-label="Conversa com o tutor"
      >
        {mensagens.length === 0 && (
          <p className="text-slate-500">Escreva uma dúvida de matemática para começar.</p>
        )}
        {mensagens.map((m, i) => (
          <div key={i} className={m.autor === "aluno" ? "text-right" : "text-left"}>
            <span className={`inline-block max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 ${
              m.autor === "aluno" ? "bg-blue-700 text-white" : "border border-slate-200 bg-slate-50 text-slate-900"}`}>
              {m.texto}
            </span>
          </div>
        ))}
        {carregando && <p className="text-slate-500">Pensando…</p>}
        <div ref={fimDaConversa} />
      </section>

      <form onSubmit={enviar} className="mt-4 flex gap-2">
        <label htmlFor="campo-pergunta" className="sr-only">Sua pergunta de matemática</label>
        <input
          id="campo-pergunta" value={pergunta} onChange={(e) => setPergunta(e.target.value)}
          placeholder="Escreva sua dúvida…" autoComplete="off"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" disabled={carregando}
          className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50">
          Enviar
        </button>
      </form>
    </main>
  );
}
