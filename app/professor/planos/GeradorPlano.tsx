"use client";

import { useState } from "react";

export default function GeradorPlano() {
  const [carregando, setCarregando] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [erro, setErro] = useState("");

  async function gerar() {
    setCarregando(true); setErro(""); setMarkdown("");
    try {
      const r = await fetch("/api/professor/plano-ensino", { method: "POST" });
      const d = await r.json();
      if (r.ok) setMarkdown(d.markdown ?? "");
      else setErro(d.erro ?? "Não foi possível gerar.");
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <button onClick={gerar} disabled={carregando}
        className="rounded-lg bg-[#3B2C63] px-4 py-2.5 font-medium text-white hover:bg-[#2f2350] disabled:opacity-50">
        {carregando ? "Gerando… (pode levar até 1 min)" : "Gerar plano de ensino com IA"}
      </button>
      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      {markdown && (
        <article className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-800">
          {markdown}
        </article>
      )}
    </div>
  );
}
