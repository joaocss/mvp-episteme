"use client";

import { useEffect, useRef, useState } from "react";

interface Mensagem {
  autor: "aluno" | "tutor";
  texto: string;
  fontes?: string[];
}

export default function PaginaTutor() {
  const [pergunta, setPergunta] = useState("");
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const fimDaConversa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimDaConversa.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

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
      const fontes: string[] | undefined = dados.fontes?.map(
        (f: { metadados?: { codigo_bncc?: string } }) => f.metadados?.codigo_bncc ?? "",
      );
      setMensagens((atual) => [...atual, { autor: "tutor", texto: textoTutor, fontes }]);
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
        <form action="/auth/sair" method="post">
          <button type="submit" className="text-sm text-slate-500 hover:text-slate-800">Sair</button>
        </form>
      </header>

      <section
        className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-lg bg-white p-4 shadow-sm"
        role="log"
        aria-live="polite"
        aria-label="Conversa com o tutor"
      >
        {mensagens.length === 0 && (
          <p className="text-slate-500">Escreva uma dúvida de matemática para começar.</p>
        )}
        {mensagens.map((m, i) => (
          <div key={i} className={m.autor === "aluno" ? "text-right" : "text-left"}>
            <span
              className={`inline-block max-w-[85%] rounded-lg px-3 py-2 ${
                m.autor === "aluno"
                  ? "bg-blue-700 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-900 whitespace-pre-line"
              }`}
            >
              {m.texto}
            </span>
            {m.fontes && m.fontes.filter(Boolean).length > 0 && (
              <p className="mt-1 text-xs text-slate-400">Base: {m.fontes.filter(Boolean).join(", ")}</p>
            )}
          </div>
        ))}
        {carregando && <p className="text-slate-500">Pensando…</p>}
        <div ref={fimDaConversa} />
      </section>

      <form onSubmit={enviar} className="mt-4 flex gap-2">
        <label htmlFor="campo-pergunta" className="sr-only">
          Sua pergunta de matemática
        </label>
        <input
          id="campo-pergunta"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Escreva sua dúvida…"
          autoComplete="off"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={carregando}
          className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </main>
  );
}
