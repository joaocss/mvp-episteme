"use client";

import { useEffect, useState } from "react";

const ROTA_PAPEL: Record<string, string> = { gestor: "/gestor", professor: "/professor", aluno: "/tutor" };
const TITULO_PAPEL: Record<string, string> = { gestor: "Gestor", professor: "Professor", aluno: "Aluno" };

export default function PaginaLogin() {
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [papelEscolhido, setPapelEscolhido] = useState<string | null>(null);

  // Le ?papel= sem useSearchParams (evita exigir Suspense nesta pagina 100% client).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("papel");
    if (p && TITULO_PAPEL[p]) setPapelEscolhido(p);
  }, []);

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
        window.location.href = ROTA_PAPEL[d.papel] ?? "/paineis";
      } else {
        const d = await r.json().catch(() => ({}));
        setErro(d.erro ?? "Não foi possível continuar.");
      }
    } finally {
      setEnviando(false);
    }
  }

  const campo =
    "mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roxo-claro";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-creme to-slate-100 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-cartao">
        <div className="flex flex-col items-center border-b border-slate-100 px-6 py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-episteme.svg" alt="Episteme — inteligência que ensina a pensar" className="h-14 w-auto" />
        </div>
        <form onSubmit={enviar} className="flex flex-col gap-3 p-6">
          <p className="text-sm text-slate-600">
            {modo === "entrar"
              ? papelEscolhido ? `Entrar como ${TITULO_PAPEL[papelEscolhido]}.` : "Entre com sua conta."
              : "Crie sua conta de aluno."}
          </p>
          {papelEscolhido && (
            <a href="/paineis" className="-mt-2 text-xs text-roxo hover:underline">← Trocar de perfil</a>
          )}
          {modo === "cadastrar" && (
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-slate-700">Nome</label>
              <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required className={campo} />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={campo} />
          </div>
          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-slate-700">Senha</label>
            <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required className={campo} />
          </div>
          {erro && <p className="text-sm text-alerta" role="alert">{erro}</p>}
          <button type="submit" disabled={enviando} className="btn-primario mt-1 w-full">
            {modo === "entrar" ? "Entrar" : "Cadastrar"}
          </button>
          <button type="button" onClick={() => { setModo(modo === "entrar" ? "cadastrar" : "entrar"); setErro(""); }}
            className="min-h-[44px] text-sm text-roxo hover:underline">
            {modo === "entrar" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
