"use client";

// Pagina publica: pedir link de redefinicao de senha. A resposta e sempre a
// mesma, exista o email ou nao (nao vaza cadastro).
import { useState } from "react";
import { Icone } from "../componentes/ui/Icone";
import { Botao } from "../componentes/ui/Botao";
import { GrupoCampo, Entrada } from "../componentes/ui/Campo";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await fetch("/api/recuperar-senha", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setEnviado(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-tela px-6 py-12">
      <div className="w-full max-w-sm">
        <a href="/login" className="mb-8 flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-roxo text-dourado">
            <Icone nome="bussola" className="h-6 w-6" />
          </span>
          <span className="font-titulo text-xl font-bold text-roxo">Episteme</span>
        </a>

        {enviado ? (
          <>
            <h1 className="text-2xl font-bold text-grafite">Verifique seu email</h1>
            <p className="mt-3 text-slate-600">
              Se houver uma conta com <strong>{email}</strong>, enviamos um link para
              redefinir a senha. O link expira em 1 hora.
            </p>
            <a href="/login" className="mt-6 inline-block text-sm font-medium text-roxo hover:underline">
              Voltar para o login
            </a>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-grafite">Recuperar senha</h1>
            <p className="mt-2 text-sm text-slate-500">
              Informe seu email cadastrado e enviaremos um link para criar uma nova senha.
            </p>
            <form onSubmit={enviar} className="mt-6 space-y-4">
              <GrupoCampo rotulo="Email">
                <Entrada type="email" value={email} required autoFocus
                  onChange={(ev) => setEmail(ev.target.value)} placeholder="voce@email.com" />
              </GrupoCampo>
              <Botao disabled={enviando} className="w-full">
                {enviando ? "Enviando…" : "Enviar link"}
              </Botao>
            </form>
            <a href="/login" className="mt-6 inline-block text-sm font-medium text-roxo hover:underline">
              Voltar para o login
            </a>
          </>
        )}
      </div>
    </main>
  );
}
