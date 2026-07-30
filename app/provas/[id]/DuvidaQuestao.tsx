"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Botao } from "../../componentes/ui/Botao";

interface Turno { pergunta: string; resposta: string; origemResposta?: string; }

const RotuloOrigem: Record<string, string> = {
  bncc: "📘 Baseado na BNCC (não está no livro da turma)",
  conhecimento_geral: "🌐 Conhecimento geral (não está no material da escola)",
};

export default function DuvidaQuestao({ questaoId }: { questaoId: string }) {
  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function perguntar(e: React.FormEvent) {
    e.preventDefault();
    if (!pergunta.trim() || carregando) return;
    const texto = pergunta.trim();
    setPergunta(""); setCarregando(true); setErro("");
    try {
      const r = await fetch("/api/provas", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao: "duvida-questao", questaoId, pergunta: texto }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.erro ?? "Falha ao responder.");
      setTurnos((atual) => [...atual, { pergunta: texto, resposta: d.resposta ?? "Não consegui responder agora.", origemResposta: d.origemResposta }]);
    } catch (e: any) {
      setErro(e.message ?? "Falha ao enviar a dúvida.");
    } finally {
      setCarregando(false);
    }
  }

  if (!aberto) {
    return (
      <Botao tamanho="pequeno" variante="fantasma" onClick={() => setAberto(true)}>
        Não entendi, quero perguntar mais
      </Botao>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-medium text-grafite">Continue perguntando sobre essa questão</p>
      <div className="mt-2 space-y-3">
        {turnos.map((t, i) => (
          <div key={i} className="space-y-1">
            <p className="text-sm text-slate-500"><span className="font-medium text-grafite">Você:</span> {t.pergunta}</p>
            {t.origemResposta && RotuloOrigem[t.origemResposta] && (
              <p className="text-xs text-amber-700">{RotuloOrigem[t.origemResposta]}</p>
            )}
            <div className="prose-tutor rounded-md bg-creme/60 p-2 text-sm text-grafite">
              <ReactMarkdown>{t.resposta}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={perguntar} className="mt-2 flex gap-2">
        <input value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Escreva sua dúvida…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roxo-claro" />
        <Botao tamanho="pequeno" disabled={carregando || !pergunta.trim()}>{carregando ? "Enviando…" : "Perguntar"}</Botao>
      </form>
      {erro && <p className="mt-1 text-sm text-alerta">{erro}</p>}
    </div>
  );
}
