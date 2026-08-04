// Estado vazio: mensagem amigavel quando ainda nao ha dados na tela.
import * as React from "react";
import { Icone, type NomeIcone } from "./Icone";

export function EstadoVazio({
  icone = "materiais",
  titulo,
  descricao,
  acao,
}: {
  icone?: NomeIcone;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-borda bg-superficie/60 px-6 py-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-roxo-suave text-roxo">
        <Icone nome={icone} className="h-6 w-6" />
      </span>
      <p className="mt-3 font-semibold text-grafite">{titulo}</p>
      {descricao && <p className="mt-1 max-w-sm text-sm text-slate-500">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}
