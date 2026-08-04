// Cartao de indicador (KPI/stat card): icone em chip + rotulo + valor grande.
import * as React from "react";
import { cn } from "../../../lib/utils";
import { Icone, type NomeIcone } from "./Icone";

export function Kpi({
  rotulo,
  valor,
  icone,
  destaque = false,
  ativoDestaque,
  dica,
}: {
  rotulo: string;
  valor: React.ReactNode;
  icone?: NomeIcone;
  // `destaque` = este KPI e de alerta; `ativoDestaque` liga o visual vermelho
  // (ex.: so quando o valor > 0). Se omitido, usa a presenca de destaque.
  destaque?: boolean;
  ativoDestaque?: boolean;
  dica?: string;
}) {
  const emAlerta = destaque && (ativoDestaque ?? true);
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-superficie p-4 shadow-cartao",
        emAlerta ? "border-alerta/30 bg-red-50/60" : "border-borda",
      )}
    >
      {icone && (
        <span
          className={cn(
            "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            emAlerta ? "bg-red-100 text-alerta" : "bg-roxo-suave text-roxo",
          )}
        >
          <Icone nome={icone} className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-500">{rotulo}</p>
        <p className={cn("mt-0.5 text-2xl font-bold leading-tight", emAlerta ? "text-alerta" : "text-grafite")}>
          {valor}
        </p>
        {dica && <p className="mt-0.5 text-xs text-slate-400">{dica}</p>}
      </div>
    </div>
  );
}
