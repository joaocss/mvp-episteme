"use client";

// Painel de modulos da escola (gestor): liga/desliga os modulos OPCIONAIS. Cada
// toggle chama a API e reflete otimista, revertendo em caso de falha. Modulos
// essenciais nao aparecem aqui — sao sempre ligados.
import { useState } from "react";
import { cn } from "../../lib/utils";
import { Cartao } from "./ui/Cartao";
import { Icone } from "./ui/Icone";
import { Selo } from "./ui/Selo";

export interface ModuloUI {
  id: string;
  nome: string;
  descricao: string;
  habilitado: boolean;
}

// Interruptor acessivel simples (sem dependencia externa).
function Interruptor({
  ligado, onToggle, ocupado, rotuloAcessivel,
}: { ligado: boolean; onToggle: () => void; ocupado: boolean; rotuloAcessivel: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotuloAcessivel}
      disabled={ocupado}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50",
        ligado ? "bg-roxo" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
          ligado ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export default function PainelModulos({ modulosIniciais }: { modulosIniciais: ModuloUI[] }) {
  const [modulos, setModulos] = useState<ModuloUI[]>(modulosIniciais);
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function alternar(m: ModuloUI) {
    const novo = !m.habilitado;
    setOcupado(m.id);
    setModulos((atual) => atual.map((x) => (x.id === m.id ? { ...x, habilitado: novo } : x)));
    try {
      const r = await fetch("/api/gestor/modulos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ moduloId: m.id, habilitado: novo }),
      });
      if (!r.ok) {
        setModulos((atual) => atual.map((x) => (x.id === m.id ? { ...x, habilitado: !novo } : x)));
      }
    } catch {
      setModulos((atual) => atual.map((x) => (x.id === m.id ? { ...x, habilitado: !novo } : x)));
    } finally {
      setOcupado(null);
    }
  }

  const ativos = modulos.filter((m) => m.habilitado).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {ativos} de {modulos.length} modulos opcionais ativos. Desligar um modulo remove-o da navegacao de
        todos os usuarios da escola; o conteudo ja criado nao e apagado.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {modulos.map((m) => (
          <Cartao
            key={m.id}
            className={cn(
              "flex items-start gap-4 p-4 transition",
              m.habilitado ? "border-roxo/25" : "opacity-75",
            )}
          >
            <span
              className={cn(
                "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                m.habilitado ? "bg-roxo-suave text-roxo" : "bg-slate-100 text-slate-400",
              )}
            >
              <Icone nome="modulos" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-grafite">{m.nome}</h3>
                <Selo cor={m.habilitado ? "sucesso" : "neutro"}>{m.habilitado ? "Ativo" : "Inativo"}</Selo>
              </div>
              <p className="mt-1 text-sm text-slate-500">{m.descricao}</p>
            </div>
            <Interruptor
              ligado={m.habilitado}
              ocupado={ocupado === m.id}
              onToggle={() => alternar(m)}
              rotuloAcessivel={`${m.habilitado ? "Desligar" : "Ligar"} modulo ${m.nome}`}
            />
          </Cartao>
        ))}
      </div>
    </div>
  );
}
