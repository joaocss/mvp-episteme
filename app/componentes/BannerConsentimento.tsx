"use client";

// Banner de consentimento parental (LGPD, soft) por filho no painel do
// responsavel. Registra o aceite ao termo vigente; nao bloqueia o uso.
import { useState } from "react";
import Link from "next/link";
import { Botao } from "./ui/Botao";
import { Icone } from "./ui/Icone";

export default function BannerConsentimento({ alunoId, alunoNome }: { alunoId: string; alunoNome: string }) {
  const [aceito, setAceito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function aceitar() {
    setEnviando(true); setErro("");
    try {
      const r = await fetch("/api/responsavel/consentimento", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ alunoId }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setErro(d.erro ?? "Falha ao registrar."); return; }
      setAceito(true);
    } finally {
      setEnviando(false);
    }
  }

  if (aceito) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-sucesso/30 bg-green-50 px-4 py-3 text-sm text-sucesso">
        <Icone nome="verificado" className="h-4 w-4" />
        Consentimento registrado para {alunoNome}. Obrigado!
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dourado/40 bg-dourado-suave/50 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-dourado/20 text-dourado-escuro">
          <Icone nome="logs" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-grafite">Consentimento de privacidade (LGPD) para {alunoNome}</p>
          <p className="mt-1 text-sm text-slate-600">
            Para tratar os dados escolares do seu filho conforme a LGPD, precisamos do seu aceite ao{" "}
            <Link href="/privacidade" className="text-roxo underline" target="_blank">termo de privacidade</Link>.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Botao tamanho="pequeno" onClick={aceitar} disabled={enviando}>
              {enviando ? "Registrando…" : "Li e concordo"}
            </Botao>
            {erro && <span className="text-sm text-alerta">{erro}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
