"use client";

import { useState } from "react";

const inp = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6aa5]";
const btn = "rounded-md bg-[#3B2C63] px-3 py-2 text-sm font-medium text-white hover:bg-[#2f2350] disabled:opacity-50";

export default function ConfiguracoesForm({ logoUrl, notaMaxima, notaMinimaAprovacao }: {
  logoUrl: string | null; notaMaxima: number; notaMinimaAprovacao: number;
}) {
  const [logo, setLogo] = useState(logoUrl ?? "");
  const [max, setMax] = useState(String(notaMaxima));
  const [min, setMin] = useState(String(notaMinimaAprovacao));
  const [msg, setMsg] = useState("");
  const [salvo, setSalvo] = useState(false);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(""); setSalvo(false);
    const r = await fetch("/api/gestor/configuracoes", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ logoUrl: logo || null, notaMaxima: Number(max), notaMinimaAprovacao: Number(min) }),
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setMsg(d.erro ?? "Erro ao salvar."); return; }
    setSalvo(true);
  }

  return (
    <form onSubmit={salvar} className="max-w-md space-y-4 cartao p-5">
      <div>
        <label className="block text-sm font-medium text-grafite">Logo da escola (URL da imagem)</label>
        <input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…" className={inp} />
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="Pré-visualização da logo" className="mt-2 h-16 w-auto rounded border border-slate-200 object-contain p-1" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-grafite">Nota máxima</label>
          <input value={max} onChange={(e) => setMax(e.target.value)} type="number" min={1} step="0.1" className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-grafite">Nota mínima p/ aprovação</label>
          <input value={min} onChange={(e) => setMin(e.target.value)} type="number" min={0} step="0.1" className={inp} />
        </div>
      </div>
      <button className={btn}>Salvar configurações</button>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      {salvo && <p className="text-sm text-green-700">Configurações salvas.</p>}
    </form>
  );
}
