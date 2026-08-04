// Primitivos de formulario temados: rotulo, input, textarea e select.
import * as React from "react";
import { cn } from "../../../lib/utils";

export function Rotulo({ className, ...resto }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("rotulo-campo", className)} {...resto} />;
}

export const Entrada = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...resto }, ref) => <input ref={ref} className={cn("campo", className)} {...resto} />,
);
Entrada.displayName = "Entrada";

export const AreaTexto = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...resto }, ref) => (
    <textarea ref={ref} className={cn("campo min-h-[96px] py-2.5", className)} {...resto} />
  ),
);
AreaTexto.displayName = "AreaTexto";

export const Selecao = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...resto }, ref) => <select ref={ref} className={cn("campo pr-8", className)} {...resto} />,
);
Selecao.displayName = "Selecao";

// Agrupador rotulo + campo com espacamento consistente.
export function GrupoCampo({
  rotulo,
  htmlFor,
  dica,
  children,
  className,
}: {
  rotulo: string;
  htmlFor?: string;
  dica?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Rotulo htmlFor={htmlFor}>{rotulo}</Rotulo>
      {children}
      {dica && <p className="text-xs text-slate-400">{dica}</p>}
    </div>
  );
}
