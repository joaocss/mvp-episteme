import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { termoVigente } from "../../src/bd/consentimento";
import { Icone } from "../componentes/ui/Icone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pagina publica com o termo de privacidade vigente (LGPD).
export default async function PaginaPrivacidade() {
  const termo = await termoVigente();

  return (
    <main className="min-h-screen bg-tela">
      <header className="border-b border-borda bg-superficie">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-roxo">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-roxo text-dourado">
              <Icone nome="bussola" className="h-5 w-5" />
            </span>
            <span className="font-titulo text-lg font-bold">Episteme</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {termo ? (
          <article className="prose-tutor rounded-xl border border-borda bg-superficie p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-grafite">{termo.titulo}</h1>
            <p className="mt-1 text-xs text-slate-400">Versao {termo.versao}</p>
            <div className="mt-4">
              <ReactMarkdown>{termo.conteudo}</ReactMarkdown>
            </div>
          </article>
        ) : (
          <p className="text-sm text-slate-500">O termo de privacidade ainda nao foi publicado.</p>
        )}
        <div className="mt-6">
          <Link href="/paineis" className="text-sm text-roxo hover:underline">← Voltar</Link>
        </div>
      </div>
    </main>
  );
}
