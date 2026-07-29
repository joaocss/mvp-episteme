import Link from "next/link";

// Cabecalho de marca reutilizavel. Mostra o logo do Episteme e, opcionalmente,
// acoes a direita (ex.: "Sair"). Mantem consistencia visual entre as telas.
export function Marca({
  acoes,
  compacto = false,
}: {
  acoes?: React.ReactNode;
  compacto?: boolean;
}) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" aria-label="Ir para o inicio do Episteme" className="inline-flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={compacto ? "/icone-episteme.svg" : "/logo-episteme.svg"}
          alt="Episteme — inteligência que ensina a pensar"
          className={compacto ? "h-9 w-auto" : "h-11 w-auto"}
        />
      </Link>
      {acoes && <div className="flex items-center gap-3">{acoes}</div>}
    </header>
  );
}
