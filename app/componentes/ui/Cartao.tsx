// Cartao no estilo shadcn/ui, temado com a identidade do Episteme.
import * as React from "react";
import { cn } from "../../../lib/utils";

export function Cartao({ className, ...resto }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-slate-200 bg-white shadow-cartao", className)} {...resto} />;
}

export function CartaoCabecalho({ className, ...resto }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-2", className)} {...resto} />;
}

export function CartaoTitulo({ className, ...resto }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-roxo", className)} {...resto} />;
}

export function CartaoDescricao({ className, ...resto }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-slate-600", className)} {...resto} />;
}

export function CartaoConteudo({ className, ...resto }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-2", className)} {...resto} />;
}
