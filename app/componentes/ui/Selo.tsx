// Selo (badge) para status e rotulos curtos.
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../../lib/utils";

export const variantesSelo = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      cor: {
        roxo: "bg-roxo-suave text-roxo",
        dourado: "bg-dourado-suave text-dourado-escuro",
        neutro: "bg-slate-100 text-slate-600",
        sucesso: "bg-green-50 text-sucesso",
        alerta: "bg-red-50 text-alerta",
        aviso: "bg-amber-50 text-aviso",
      },
    },
    defaultVariants: { cor: "neutro" },
  },
);

export function Selo({
  className,
  cor,
  ...resto
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof variantesSelo>) {
  return <span className={cn(variantesSelo({ cor }), className)} {...resto} />;
}
