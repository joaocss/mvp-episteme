// Conjunto minimo de icones (SVG inline, tracado) para navegacao e cabecalhos.
// Evita dependencia externa; todos herdam a cor via `currentColor`.
import * as React from "react";

export type NomeIcone =
  | "painel" | "cadastros" | "materiais" | "reenturmar" | "alunos" | "desempenho"
  | "relatorios" | "logs" | "config" | "provas" | "planos" | "tutor" | "sair"
  | "menu" | "fechar" | "usuario" | "mais" | "upload" | "escola" | "bussola" | "seta"
  | "modulos" | "lixeira" | "documento" | "versao" | "verificado";

const CAMINHOS: Record<NomeIcone, React.ReactNode> = {
  painel: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  cadastros: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 8.5a3 3 0 0 1 0 5" /><path d="M18.5 20a5 5 0 0 0-3-4.6" /></>,
  materiais: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H18a1 1 0 0 1 1 1v13.5" /><path d="M4 5.5V19a1 1 0 0 0 1 1h14" /><path d="M8 8h7M8 11.5h7" /></>,
  reenturmar: <><path d="M4 7h11l-2.5-2.5M20 17H9l2.5 2.5" /></>,
  alunos: <><circle cx="12" cy="7" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /><path d="M12 12.5v4M12 16.5l-1.8-1.8M12 16.5l1.8-1.8" /></>,
  desempenho: <><path d="M4 20V4M4 20h16" /><rect x="7" y="12" width="3" height="5" rx="0.5" /><rect x="12" y="8" width="3" height="9" rx="0.5" /><rect x="17" y="5" width="3" height="12" rx="0.5" /></>,
  relatorios: <><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M13 3v4h4M9 12h6M9 15.5h6" /></>,
  logs: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M12 9v3.5M12 15.5h.01" /></>,
  config: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M5 12H3M21 12h-2.5M6 6l1.8 1.8M16.2 16.2 18 18M18 6l-1.8 1.8M7.8 16.2 6 18" /></>,
  provas: <><rect x="5" y="4" width="14" height="17" rx="1.5" /><path d="M9 3.5h6v2.5H9zM8.5 11l1.5 1.5L13 9M8.5 16l1.5 1.5L13 14" /></>,
  planos: <><rect x="4" y="5" width="16" height="16" rx="1.5" /><path d="M4 9h16M8 3v4M16 3v4M8.5 13h3M8.5 16.5h7" /></>,
  tutor: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 3.5V16H5.5" /><path d="M12 7.5v.01M9.2 9.8a2.8 2.8 0 1 1 3.6 3c-.5.3-.8.7-.8 1.2" /></>,
  sair: <><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" /><path d="M10 12H3M3 12l3-3M3 12l3 3" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  fechar: <><path d="M6 6l12 12M18 6 6 18" /></>,
  usuario: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  mais: <><path d="M12 5v14M5 12h14" /></>,
  upload: <><path d="M12 16V5M12 5 8 9M12 5l4 4" /><path d="M5 15v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" /></>,
  escola: <><path d="M3 10 12 4l9 6" /><path d="M5 10v9h14v-9" /><path d="M10 19v-4h4v4" /></>,
  bussola: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5 13 13l-4.5 2.5L11 11z" /></>,
  seta: <><path d="M9 6l6 6-6 6" /></>,
  modulos: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.3" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.3" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.3" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.3" /></>,
  lixeira: <><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M10 11v6M14 11v6" /></>,
  documento: <><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M13 3v4h4" /></>,
  versao: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4h4" /><path d="M12 8v4l3 2" /></>,
  verificado: <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.2 2.2L15.5 10" /></>,
};

export function Icone({
  nome,
  className = "h-5 w-5",
  ...resto
}: { nome: NomeIcone; className?: string } & Omit<React.SVGProps<SVGSVGElement>, "className">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...resto}
    >
      {CAMINHOS[nome]}
    </svg>
  );
}
