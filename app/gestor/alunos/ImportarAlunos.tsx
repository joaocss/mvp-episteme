"use client";

// Importacao de alunos por CSV (diretor). Mostra o resultado (criados + erros
// por linha) e os convites gerados (o aluno/pai define a propria senha pelo
// link; enviado por email e disponivel aqui para compartilhar manualmente).
import { useState } from "react";

const btn = "rounded-md bg-[#3B2C63] px-3 py-2 text-sm font-medium text-white hover:bg-[#2f2350] disabled:opacity-50";

interface Convite { nome: string; email: string; link: string }
interface Resultado { criados: number; erros: { linha: number; motivo: string }[]; convites: Convite[] }

export default function ImportarAlunos() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [res, setRes] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState<number | null>(null);

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

  async function copiar(link: string, i: number) {
    try { await navigator.clipboard.writeText(link); setCopiado(i); setTimeout(() => setCopiado(null), 1500); } catch { /* ignora */ }
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
        Deixe a coluna <code>senha</code> vazia para o aluno/responsável <strong>definir a própria senha</strong> pelo link do convite (enviado por email). Se salvou no Excel, use <em>Salvar como → CSV</em>.
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

          {res.convites.length > 0 && (
            <div className="mt-3">
              <p className="text-slate-700">
                {res.convites.length} convite(s) de senha gerado(s). O link foi enviado por email
                (quando configurado); enquanto isso, você pode copiar e compartilhar:
              </p>
              <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
                {res.convites.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                    <span className="min-w-0 truncate text-slate-700">
                      {c.nome}{c.email ? ` · ${c.email}` : " · (sem email)"}
                    </span>
                    <button type="button" onClick={() => copiar(c.link, i)}
                      className="shrink-0 text-xs font-medium text-roxo hover:underline">
                      {copiado === i ? "copiado!" : "copiar link"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {res.erros.length > 0 && (
            <div className="mt-3">
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
