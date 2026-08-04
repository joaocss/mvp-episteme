"use client";

// Casca visual do app autenticado: barra lateral (navegacao por papel) + topo
// com contexto da escola e usuario. Client component por causa do link ativo
// (usePathname) e do menu lateral no mobile.
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils";
import { Icone, type NomeIcone } from "./ui/Icone";

export interface ItemNav {
  rotulo: string;
  href: string;
  icone: NomeIcone;
  // Combina tambem em subrotas (ex.: /gestor/gestao). Se falso, so match exato.
  prefixo?: boolean;
}

export interface DadosCasca {
  itens: ItemNav[];
  rotuloPapel: string;
  nomeUsuario: string;
  emailUsuario: string;
  nomeEscola: string;
  logoEscola: string | null;
}

function linkAtivo(caminho: string, item: ItemNav): boolean {
  if (item.prefixo === false) return caminho === item.href;
  return caminho === item.href || caminho.startsWith(item.href + "/");
}

export function CascaApp({ dados, children }: { dados: DadosCasca; children: React.ReactNode }) {
  const caminho = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const iniciais = dados.nomeUsuario.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  const conteudoLateral = (
    <div className="flex h-full flex-col bg-gradiente-roxo text-white">
      {/* Marca */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-dourado">
          <Icone nome="bussola" className="h-6 w-6" />
        </span>
        <div className="leading-tight">
          <p className="font-titulo text-lg font-bold tracking-wide">Episteme</p>
          <p className="text-[11px] text-white/60">ensina a pensar</p>
        </div>
      </div>

      {/* Contexto da escola */}
      <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2.5">
        {dados.logoEscola ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dados.logoEscola} alt="" className="h-7 w-7 rounded object-contain" />
        ) : (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-white/10 text-white/80">
            <Icone nome="escola" className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{dados.nomeEscola || "Escola"}</p>
          <p className="text-[11px] text-white/50">{dados.rotuloPapel}</p>
        </div>
      </div>

      {/* Navegacao */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Navegacao principal">
        {dados.itens.map((item) => {
          const ativo = linkAtivo(caminho, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuAberto(false)}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                ativo ? "bg-white/15 text-white shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icone nome={item.icone} className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.rotulo}</span>
            </Link>
          );
        })}
      </nav>

      {/* Usuario + sair */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 px-1 py-1">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dourado/90 text-sm font-bold text-roxo-escuro">
            {iniciais || "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{dados.nomeUsuario}</p>
            <p className="truncate text-[11px] text-white/50">{dados.emailUsuario}</p>
          </div>
        </div>
        <form action="/auth/sair" method="post" className="mt-2">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Icone nome="sair" className="h-5 w-5" />
            Sair
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Sidebar fixa (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 shadow-lateral lg:block">{conteudoLateral}</aside>

      {/* Topbar (mobile) */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-borda bg-superficie/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMenuAberto(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-borda text-grafite"
          aria-label="Abrir menu"
        >
          <Icone nome="menu" className="h-5 w-5" />
        </button>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-roxo text-dourado">
          <Icone nome="bussola" className="h-5 w-5" />
        </span>
        <span className="font-titulo text-lg font-bold text-roxo">Episteme</span>
      </header>

      {/* Drawer (mobile) */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-grafite/50" onClick={() => setMenuAberto(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-64 shadow-lateral">
            <button
              type="button"
              onClick={() => setMenuAberto(false)}
              className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
              aria-label="Fechar menu"
            >
              <Icone nome="fechar" className="h-5 w-5" />
            </button>
            {conteudoLateral}
          </div>
        </div>
      )}

      {/* Conteudo */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="animate-surgir">{children}</div>
      </main>
    </div>
  );
}
