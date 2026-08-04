"use client";

// Importacao de alunos por CSV (diretor). Mostra o resultado (criados + erros
// por linha) e avisa quando a senha padrao foi aplicada.
import { useState } from "react";

const btn = "rounded-md bg-[#3B2C63] px-3 py-2 text-sm font-medium text-white hover:bg-[#2f2350] disabled:opacity-50";

interface Resultado { criados: number; erros: { linha: number; motivo: string }[]; senhaPadraoUsada: boolean }

export default function ImportarAlunos() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [res, setRes] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");

  async function enviar() {
    setErro(""); setRes(null);
    if (!arquivo) { setErro("Anexe um arquivo CSV."); return; }
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.set("arquivo", arquivo);
      const r = await fetch("/api/gestor/alunos/import", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d.erro ?? "Falha ao importar."); return; }
      setRes(d);
    } finally {
      setEnviando(false);
    }
  }

  function baixarModelo() {
    const csv = "﻿nome;email;senha;turma;data_nascimento\r\nMaria Silva;maria@escola.com;;6o A;2014-03-12\r\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "modelo_importacao_alunos.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="cartao p-5">
      <h2 className="text-lg font-semibold text-grafite">Importar alunos (CSV)</h2>
      <p className="mt-1 text-sm text-slate-500">
        Colunas: <code>nome</code> (obrigatória), <code>email</code>, <code>senha</code>, <code>turma</code> (nome exato da turma), <code>data_nascimento</code>.
        Se salvou no Excel, use <em>Salvar como → CSV</em>.
      </p>
      <button onClick={baixarModelo} className="mt-2 text-sm text-roxo hover:underline" type="button">Baixar modelo CSV</button>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input type="file" accept=".csv,text/csv" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} className="text-sm" />
        <button onClick={enviar} className={btn} disabled={enviando}>{enviando ? "Importando…" : "Importar"}</button>
      </div>
      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

      {res && (
        <div className="mt-4 rounded-md border border-slate-200 p-4 text-sm">
          <p className="font-medium text-green-700">{res.criados} aluno(s) importado(s).</p>
          {res.senhaPadraoUsada && (
            <p className="mt-1 text-amber-700">Alunos sem senha na planilha receberam a senha padrão <code>episteme123</code> — oriente a troca.</p>
          )}
          {res.erros.length > 0 && (
            <div className="mt-2">
              <p className="font-medium text-red-700">{res.erros.length} linha(s) com erro:</p>
              <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto text-slate-600">
                {res.erros.map((e, i) => <li key={i}>Linha {e.linha}: {e.motivo}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
