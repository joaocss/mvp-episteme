"use client";

import { useState } from "react";

interface Item {
  questaoId: string; alunoId: string; aluno: string; enunciado: string; tipo: "objetiva" | "dissertativa";
  respostaAluno: string | null; gabarito: string; notaAutomatica: number | null; notaManual: number | null;
  feedbackIa: string | null; feedbackProfessor: string | null;
}

const inp = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6aa5]";
const btn = "rounded-md bg-[#3B2C63] px-3 py-2 text-sm font-medium text-white hover:bg-[#2f2350] disabled:opacity-50";

function LinhaCorrecao({ item, notaMaxima }: { item: Item; notaMaxima: number }) {
  const [nota, setNota] = useState(String(item.notaManual ?? item.notaAutomatica ?? ""));
  const [feedback, setFeedback] = useState(item.feedbackProfessor ?? "");
  const [msg, setMsg] = useState("");
  const [salvo, setSalvo] = useState(false);

  async function salvar() {
    setMsg(""); setSalvo(false);
    const valor = Number(nota);
    if (Number.isNaN(valor) || valor < 0 || valor > notaMaxima) { setMsg(`Nota deve ser entre 0 e ${notaMaxima}.`); return; }
    const r = await fetch("/api/professor/correcao", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ questaoId: item.questaoId, alunoId: item.alunoId, notaManual: valor, feedbackProfessor: feedback }),
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setMsg(d.erro ?? "Erro ao salvar."); return; }
    setSalvo(true);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-800">{item.aluno} <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{item.tipo}</span></p>
      <p className="mt-1 text-sm text-slate-600">{item.enunciado}</p>
      <p className="mt-2 text-sm"><span className="text-slate-400">Resposta do aluno:</span> {item.respostaAluno || "—"}</p>
      <p className="text-sm"><span className="text-slate-400">Gabarito:</span> {item.gabarito}</p>
      {item.feedbackIa && <p className="mt-1 text-sm text-slate-500"><span className="text-slate-400">Feedback da IA:</span> {item.feedbackIa}</p>}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-slate-500">Nota (0–{notaMaxima})</label>
          <input value={nota} onChange={(e) => setNota(e.target.value)} type="number" min={0} max={notaMaxima} step="0.1" className={inp + " w-24"} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-slate-500">Feedback do professor (opcional)</label>
          <input value={feedback} onChange={(e) => setFeedback(e.target.value)} className={inp} />
        </div>
        <button className={btn} onClick={salvar}>Salvar correção</button>
      </div>
      {msg && <p className="mt-1 text-sm text-red-600">{msg}</p>}
      {salvo && <p className="mt-1 text-sm text-green-700">Correção salva.</p>}
    </div>
  );
}

export default function CorrecaoManual({ itens, notaMaxima }: { itens: Item[]; notaMaxima: number }) {
  return (
    <div className="space-y-3">
      {itens.length === 0 && <p className="text-slate-500">Ainda não há respostas de alunos para corrigir.</p>}
      {itens.map((i) => <LinhaCorrecao key={`${i.questaoId}-${i.alunoId}`} item={i} notaMaxima={notaMaxima} />)}
    </div>
  );
}
