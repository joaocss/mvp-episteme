"use client";

// Chat do assistente da equipe (professor/gestao). Responde a partir dos
// documentos com audiencia do papel de quem pergunta (ou 'escola'). Visual sobre
// os tokens da marca; markdown via RespostaRica.
import { useState, useRef, useEffect } from "react";
import { Cartao } from "./ui/Cartao";
import { Botao } from "./ui/Botao";
import { Entrada } from "./ui/Campo";
import { Icone } from "./ui/Icone";
import RespostaRica from "./RespostaRica";

interface Turno { autor: "usuario" | "ia"; texto: string }

export default function AssistenteChat() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [pensando, setPensando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turnos, pensando]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const texto = pergunta.trim();
    if (!texto || pensando) return;
    setPergunta("");
    setTurnos((t) => [...t, { autor: "usuario", texto }]);
    setPensando(true);
    try {
      const r = await fetch("/api/professor/assistente", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ pergunta: texto }),
      });
      const d = await r.json().catch(() => ({}));
      const resposta = r.ok ? (d.resposta ?? "") : (d.erro ?? "Falha ao responder.");
      setTurnos((t) => [...t, { autor: "ia", texto: resposta }]);
    } finally {
      setPensando(false);
    }
  }

  return (
    <Cartao className="flex flex-col p-5">
      <div className="min-h-[320px] space-y-3">
        {turnos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-roxo-suave text-roxo">
              <Icone nome="tutor" className="h-6 w-6" />
            </span>
            <p className="mt-3 font-medium text-grafite">Pergunte sobre os documentos da escola</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Ex.: &quot;O que diz o regimento sobre faltas?&quot; — respondo com base nos documentos disponibilizados para a equipe.
            </p>
          </div>
        )}
        {turnos.map((t, i) => (
          <div key={i} className={t.autor === "usuario" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              t.autor === "usuario" ? "bg-roxo text-white" : "border border-borda bg-tela text-grafite"}`}>
              {t.autor === "ia"
                ? <div className="prose-tutor"><RespostaRica texto={t.texto} /></div>
                : <p className="whitespace-pre-wrap">{t.texto}</p>}
            </div>
          </div>
        ))}
        {pensando && <p className="text-sm text-slate-400">Consultando os documentos…</p>}
        <div ref={fimRef} />
      </div>

      <form onSubmit={enviar} className="mt-4 flex gap-2">
        <Entrada value={pergunta} onChange={(e) => setPergunta(e.target.value)}
          placeholder="Escreva sua pergunta…" disabled={pensando} />
        <Botao disabled={pensando || !pergunta.trim()}>Enviar</Botao>
      </form>
    </Cartao>
  );
}
