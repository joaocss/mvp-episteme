"use client";

import { useEffect, useState } from "react";
import { Icone } from "../componentes/ui/Icone";

const ROTA_PAPEL: Record<string, string> = { gestor: "/gestor", professor: "/professor", aluno: "/tutor", responsavel: "/responsavel" };
const TITULO_PAPEL: Record<string, string> = { gestor: "Gestor", professor: "Professor", aluno: "Aluno", responsavel: "Responsável" };

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
        setErro(d.erro ?? "Nao foi possivel continuar.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Lado da marca */}
      <div className="relative hidden flex-col justify-between bg-gradiente-roxo p-10 text-white lg:flex">
        <a href="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-dourado">
            <Icone nome="bussola" className="h-6 w-6" />
          </span>
          <span className="font-titulo text-xl font-bold">Episteme</span>
        </a>
        <div>
          <h2 className="max-w-sm font-titulo text-3xl font-bold leading-snug">
            {papelEscolhido ? `Acesso do ${TITULO_PAPEL[papelEscolhido]}.` : "Bem-vindo de volta."}
          </h2>
          <p className="mt-4 max-w-sm text-white/70">
            A inteligencia que ensina a pensar, ancorada no material da sua escola.
          </p>
        </div>
        <p className="text-sm text-white/40">Inteligencia que ensina a pensar.</p>
      </div>

      {/* Lado do formulario */}
      <div className="flex items-center justify-center bg-tela px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Marca compacta (visivel no mobile) */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-roxo text-dourado">
              <Icone nome="bussola" className="h-6 w-6" />
            </span>
            <span className="font-titulo text-xl font-bold text-roxo">Episteme</span>
          </div>

          <h1 className="text-2xl font-bold text-grafite">
            {modo === "entrar" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {modo === "entrar"
              ? papelEscolhido
                ? `Entre com sua conta de ${TITULO_PAPEL[papelEscolhido].toLowerCase()}.`
                : "Entre com sua conta."
              : "Crie sua conta de aluno."}
          </p>
          {papelEscolhido && (
            <a href="/paineis" className="mt-1 inline-block text-xs text-roxo hover:underline">
              &larr; Trocar de perfil
            </a>
          )}

          <form onSubmit={enviar} className="mt-6 flex flex-col gap-4">
            {modo === "cadastrar" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="nome" className="rotulo-campo">Nome</label>
                <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required className="campo" />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="rotulo-campo">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="campo" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="senha" className="rotulo-campo">Senha</label>
              <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required className="campo" />
            </div>
            {erro && (
              <p className="rounded-lg border border-alerta/30 bg-red-50 px-3 py-2 text-sm text-alerta" role="alert">
                {erro}
              </p>
            )}
            <button type="submit" disabled={enviando} className="btn-primario mt-1 w-full">
              {enviando ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Cadastrar"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => { setModo(modo === "entrar" ? "cadastrar" : "entrar"); setErro(""); }}
            className="mt-4 min-h-[44px] w-full text-sm text-roxo hover:underline"
          >
            {modo === "entrar" ? "Nao tem conta? Cadastre-se" : "Ja tem conta? Entrar"}
          </button>
        </div>
      </div>
    </main>
  );
}
