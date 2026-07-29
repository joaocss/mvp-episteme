// Botao no estilo shadcn/ui, temado com a identidade do Episteme.
// Exporta tambem `variantesBotao` para aplicar o mesmo visual a <Link>.
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../../lib/utils";

export const variantesBotao = cva(
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg text-sm font-medium " +
    "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roxo-claro " +
    "disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variante: {
        primario: "bg-roxo text-white hover:bg-roxo-escuro",
        secundario: "border border-roxo/30 bg-white text-roxo hover:bg-creme",
        fantasma: "text-roxo hover:bg-creme",
        perigo: "bg-alerta text-white hover:bg-red-800",
      },
      tamanho: {
        padrao: "px-5 py-2.5",
        pequeno: "min-h-[38px] px-3 py-2 text-sm",
        icone: "h-11 w-11 p-0",
      },
    },
    defaultVariants: { variante: "primario", tamanho: "padrao" },
  },
);

export interface PropsBotao
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variantesBotao> {}

export const Botao = React.forwardRef<HTMLButtonElement, PropsBotao>(
  ({ className, variante, tamanho, ...resto }, ref) => (
    <button ref={ref} className={cn(variantesBotao({ variante, tamanho }), className)} {...resto} />
  ),
);
Botao.displayName = "Botao";
