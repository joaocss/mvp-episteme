"use client";

// Pagina publica: definir a 1a senha (convite) ou redefinir (reset), via token
// do link recebido por email. Valida o token ao abrir; grava a senha no envio.
import { useEffect, useState } from "react";
import { Icone } from "../componentes/ui/Icone";
import { Botao } from "../componentes/ui/Botao";
import { GrupoCampo, Entrada } from "../componentes/ui/Campo";

const MIN_SENHA = 8;

export default function DefinirSenha() {
  const [token, setToken] = useState("");
  const [estado, setEstado] = useState<"carregando" | "valido" | "invalido" | "concluido">("carregando");
  const [tipo, setTipo] = useState<"convite" | "reset" | null>(null);
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(t);
    if (!t) { setEstado("invalido"); return; }
    fetch(`/api/definir-senha?token=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valido) { setTipo(d.tipo); setEstado("valido"); }
        else setEstado("invalido");
      })
      .catch(() => setEstado("invalido"));
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < MIN_SENHA) { setErro(`Use ao menos ${MIN_SENHA} caracteres.`); return; }
    if (senha !== confirmar) { setErro("As senhas nao coincidem."); return; }
    setEnviando(true);
    try {
      const r = await fetch("/api/definir-senha", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, senha }),
      });
      if (r.ok) setEstado("concluido");
      else { const d = await r.json().catch(() => ({})); setErro(d.erro ?? "Nao foi possivel definir a senha."); }
    } finally {
      setEnviando(false);
    }
  }

  const ehConvite = tipo === "convite";

  return (
    <main className="flex min-h-screen items-center justify-center bg-tela px-6 py-12">
      <div className="w-full max-w-sm">
        <a href="/login" className="mb-8 flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-roxo text-dourado">
            <Icone nome="bussola" className="h-6 w-6" />
          </span>
          <span className="font-titulo text-xl font-bold text-roxo">Episteme</span>
        </a>

        {estado === "carregando" && <p className="text-slate-500">Validando o link…</p>}

        {estado === "invalido" && (
          <>
            <h1 className="text-2xl font-bold text-grafite">Link invalido ou expirado</h1>
            <p className="mt-3 text-slate-600">
              Este link nao e mais valido. Peca um novo em "Recuperar senha".
            </p>
            <a href="/recuperar-senha" className="mt-6 inline-block text-sm font-medium text-roxo hover:underline">
              Recuperar senha
            </a>
          </>
        )}

        {estado === "concluido" && (
          <>
            <h1 className="text-2xl font-bold text-grafite">Senha definida</h1>
            <p className="mt-3 text-slate-600">Sua senha foi salva. Ja pode entrar.</p>
            <a href="/login" className="mt-6 inline-block">
              <Botao className="w-full">Ir para o login</Botao>
            </a>
          </>
        )}

        {estado === "valido" && (
          <>
            <h1 className="text-2xl font-bold text-grafite">
              {ehConvite ? "Defina sua senha" : "Nova senha"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {ehConvite
                ? "Bem-vindo ao Episteme. Crie uma senha para acessar sua conta."
                : "Crie uma nova senha para sua conta."}
            </p>
            <form onSubmit={enviar} className="mt-6 space-y-4">
              <GrupoCampo rotulo="Nova senha" dica={`Ao menos ${MIN_SENHA} caracteres.`}>
                <Entrada type="password" value={senha} required autoFocus
                  onChange={(ev) => setSenha(ev.target.value)} placeholder="••••••••" />
              </GrupoCampo>
              <GrupoCampo rotulo="Confirmar senha">
                <Entrada type="password" value={confirmar} required
                  onChange={(ev) => setConfirmar(ev.target.value)} placeholder="••••••••" />
              </GrupoCampo>
              {erro && <p className="text-sm text-alerta">{erro}</p>}
              <Botao disabled={enviando} className="w-full">
                {enviando ? "Salvando…" : "Salvar senha"}
              </Botao>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
