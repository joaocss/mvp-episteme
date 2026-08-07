"use client";

import { useState } from "react";

const inp = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6aa5]";
const btn = "rounded-md bg-[#3B2C63] px-3 py-2 text-sm font-medium text-white hover:bg-[#2f2350] disabled:opacity-50";

export default function ConfiguracoesForm({ nome, logoUrl, notaMaxima, notaMinimaAprovacao }: {
  nome: string; logoUrl: string | null; notaMaxima: number; notaMinimaAprovacao: number;
}) {
  const [nomeEscola, setNomeEscola] = useState(nome);
  const [logo, setLogo] = useState(logoUrl ?? "");
  const [max, setMax] = useState(String(notaMaxima));
  const [min, setMin] = useState(String(notaMinimaAprovacao));
  const [msg, setMsg] = useState("");
  const [salvo, setSalvo] = useState(false);

  // Upload de imagem -> data-URL (logos sao pequenos; evita depender de URL
  // externa/Storage). Guarda no mesmo campo logo (data:image/...;base64,...).
  function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) { setMsg("Escolha um arquivo de imagem."); return; }
    if (arquivo.size > 400 * 1024) { setMsg("Imagem muito grande (max. 400 KB). Reduza a logo."); return; }
    const leitor = new FileReader();
    leitor.onload = () => { setLogo(String(leitor.result)); setMsg(""); };
    leitor.readAsDataURL(arquivo);
  }

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(""); setSalvo(false);
    const r = await fetch("/api/gestor/configuracoes", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ nome: nomeEscola, logoUrl: logo || null, notaMaxima: Number(max), notaMinimaAprovacao: Number(min) }),
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setMsg(d.erro ?? "Erro ao salvar."); return; }
    setSalvo(true);
  }

  return (
    <form onSubmit={salvar} className="max-w-md space-y-4 cartao p-5">
      <div>
        <label className="block text-sm font-medium text-grafite">Nome da escola</label>
        <input value={nomeEscola} onChange={(e) => setNomeEscola(e.target.value)} required className={inp} />
      </div>
      <div>
        <label className="block text-sm font-medium text-grafite">Logo da escola</label>
        <p className="mt-0.5 text-xs text-slate-500">Envie um arquivo de imagem (recomendado) ou cole a URL direta de uma imagem.</p>
        <div className="mt-2 flex items-center gap-3">
          <label className="cursor-pointer rounded-md border border-[#3B2C63]/30 bg-white px-3 py-2 text-sm font-medium text-[#3B2C63] hover:bg-[#3B2C63]/5">
            Enviar imagem
            <input type="file" accept="image/*" onChange={aoEscolherArquivo} className="hidden" />
          </label>
          {logo && <button type="button" onClick={() => setLogo("")} className="text-xs text-slate-500 hover:text-red-600">remover</button>}
        </div>
        <input value={logo.startsWith("data:") ? "" : logo} onChange={(e) => setLogo(e.target.value)}
          placeholder="https://… (URL direta de imagem)" className={`${inp} mt-2`} />
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="Pré-visualização da logo" className="mt-2 h-16 w-auto rounded border border-slate-200 object-contain p-1"
            onError={() => setMsg("Nao consegui carregar essa imagem — verifique a URL ou envie um arquivo.")} />
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
