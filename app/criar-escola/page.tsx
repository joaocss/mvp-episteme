"use client";

// Cadastro self-service de escola (publico). A escola preenche nome + gestor +
// email; criamos o tenant e o gestor recebe o convite para definir a senha.
import { useState } from "react";
import { Icone } from "../componentes/ui/Icone";

export default function CriarEscola() {
  const [nomeEscola, setNomeEscola] = useState("");
  const [nomeGestor, setNomeGestor] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState<{ emailEnviado?: boolean; link?: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nomeEscola, nomeGestor, email }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setPronto(d);
      else setErro(d.erro ?? "Nao foi possivel cadastrar a escola.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradiente-roxo p-10 text-white lg:flex">
        <a href="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-dourado">
            <Icone nome="bussola" className="h-6 w-6" />
          </span>
          <span className="font-titulo text-xl font-bold">Episteme</span>
        </a>
        <div>
          <h2 className="max-w-sm font-titulo text-3xl font-bold leading-snug">Leve o tutor para a sua escola.</h2>
          <p className="mt-4 max-w-sm text-white/70">
            Cadastre a escola em minutos. Depois voce sobe o material e o tutor passa a responder ancorado no conteudo da sua escola.
          </p>
        </div>
        <p className="text-sm text-white/40">Inteligencia que ensina a pensar.</p>
      </div>

      <div className="flex items-center justify-center bg-tela px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-roxo text-dourado">
              <Icone nome="bussola" className="h-6 w-6" />
            </span>
            <span className="font-titulo text-xl font-bold text-roxo">Episteme</span>
          </div>

          {pronto ? (
            <div>
              <h1 className="text-2xl font-bold text-grafite">Escola cadastrada! 🎉</h1>
              {pronto.emailEnviado ? (
                <p className="mt-2 text-sm text-slate-600">
                  Enviamos um email para <strong>{email}</strong> com o link para voce definir sua senha de gestor.
                  Confira a caixa de entrada (e o spam).
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-slate-600">
                    Use o link abaixo para definir sua senha de gestor e entrar:
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <input readOnly value={pronto.link ?? ""} className="campo flex-1 text-xs" />
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard?.writeText(pronto.link ?? ""); setCopiado(true); }}
                      className="btn-primario shrink-0 px-3 py-2 text-sm"
                    >
                      {copiado ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                  <a href={pronto.link} className="mt-3 inline-block text-sm font-medium text-roxo hover:underline">
                    Abrir o link agora &rarr;
                  </a>
                </>
              )}
              <div className="mt-6 rounded-lg border border-borda bg-white p-3 text-sm text-slate-600">
                <p className="font-medium text-grafite">Proximos passos apos entrar:</p>
                <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
                  <li>Criar as turmas</li>
                  <li>Subir o material (PDF) da escola</li>
                  <li>Cadastrar professores e alunos</li>
                </ol>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-grafite">Cadastrar minha escola</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Voce sera o gestor. Depois define a senha por um link de convite.
              </p>
              <form onSubmit={enviar} className="mt-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="escola" className="rotulo-campo">Nome da escola</label>
                  <input id="escola" value={nomeEscola} onChange={(e) => setNomeEscola(e.target.value)} required className="campo" placeholder="Ex.: Colegio Sao Rafael" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="gestor" className="rotulo-campo">Seu nome (gestor)</label>
                  <input id="gestor" value={nomeGestor} onChange={(e) => setNomeGestor(e.target.value)} required className="campo" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="rotulo-campo">Seu email</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="campo" />
                </div>
                {erro && (
                  <p className="rounded-lg border border-alerta/30 bg-red-50 px-3 py-2 text-sm text-alerta" role="alert">{erro}</p>
                )}
                <button type="submit" disabled={enviando} className="btn-primario mt-1 w-full">
                  {enviando ? "Cadastrando..." : "Cadastrar escola"}
                </button>
              </form>
              <p className="mt-4 text-center text-sm text-slate-500">
                Ja tem conta? <a href="/login" className="font-medium text-roxo hover:underline">Entrar</a>
              </p>
            </>
          )}
          <p className="mt-4 text-center text-xs text-slate-400">
            <a href="/privacidade" className="hover:text-roxo hover:underline">Termo de privacidade</a>
          </p>
        </div>
      </div>
    </main>
  );
}
