"use client";

import { useState } from "react";

export default function PaginaLogin() {
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
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
        body: JSON.stringify({ email, nome }),
      });
      if (r.ok) {
        const d = await r.json().catch(() => ({}));
        window.location.href = d.papel === "professor" ? "/professor" : "/tutor";
      } else {
        const d = await r.json().catch(() => ({}));
        setErro(d.erro ?? "Não foi possível continuar.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Episteme — Tutor 6º ano</h1>
      <p className="text-slate-600">
        {modo === "entrar" ? "Entre com o email da escola." : "Cadastre-se para usar o tutor."}
      </p>
      <form onSubmit={enviar} className="flex flex-col gap-3">
        {modo === "cadastrar" && (
          <div>
            <label htmlFor="nome" className="block text-sm text-slate-700">Nome</label>
            <input
              id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm text-slate-700">Email</label>
          <input
            id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {erro && <p className="text-sm text-red-600" role="alert">{erro}</p>}
        <button
          type="submit" disabled={enviando}
          className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {modo === "entrar" ? "Entrar" : "Cadastrar"}
        </button>
      </form>
      <button
        onClick={() => { setModo(modo === "entrar" ? "cadastrar" : "entrar"); setErro(""); }}
        className="text-sm text-blue-700 hover:underline"
      >
        {modo === "entrar" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
      </button>
    </main>
  );
}
