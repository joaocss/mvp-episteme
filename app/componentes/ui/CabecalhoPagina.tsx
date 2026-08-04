// Cabecalho padrao de pagina interna: titulo, subtitulo e acoes a direita.
import * as React from "react";
import { cn } from "../../../lib/utils";

export function CabecalhoPagina({
  titulo,
  subtitulo,
  acoes,
  className,
}: {
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  acoes?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-grafite">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  );
}
