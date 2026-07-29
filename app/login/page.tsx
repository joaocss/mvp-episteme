"use client";

import { useState } from "react";

export default function PaginaLogin() {
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const rota = modo === "entrar" ? "/api/login" : "/api/cadastro";
      const r = await fetch(rota, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, nome, senha }),
      });
      if (r.ok) {
        const d = await r.json().catch(() => ({}));
        window.location.href = d.papel === "gestor" ? "/gestor" : d.papel === "professor" ? "/professor" : "/tutor";
      } else {
        const d = await r.json().catch(() => ({}));
        setErro(d.erro ?? "Não foi possível continuar.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="bg-blue-700 px-6 py-6 text-white">
          <h1 className="text-xl font-bold">Episteme</h1>
          <p className="text-sm text-blue-100">Tutor de Matemática — 6º ano</p>
        </div>
        <form onSubmit={enviar} className="flex flex-col gap-3 p-6">
          <p className="text-sm text-slate-600">
            {modo === "entrar" ? "Entre com sua conta." : "Crie sua conta de aluno."}
          </p>
          {modo === "cadastrar" && (
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-slate-700">Nome</label>
              <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-slate-700">Senha</label>
            <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {erro && <p className="text-sm text-red-600" role="alert">{erro}</p>}
          <button type="submit" disabled={enviando}
            className="mt-1 rounded-lg bg-blue-700 px-4 py-2.5 font-medium text-white transition hover:bg-blue-800 disabled:opacity-50">
            {modo === "entrar" ? "Entrar" : "Cadastrar"}
          </button>
          <button type="button" onClick={() => { setModo(modo === "entrar" ? "cadastrar" : "entrar"); setErro(""); }}
            className="text-sm text-blue-700 hover:underline">
            {modo === "entrar" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
