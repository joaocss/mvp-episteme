// Utilitario de composicao de classes Tailwind (padrao shadcn/ui).
// Junta condicionais (clsx) e resolve conflitos de classe (tailwind-merge).
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...entradas: ClassValue[]): string {
  return twMerge(clsx(entradas));
}
