import Link from "next/link";

export default function Inicio() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Episteme — Tutor de Matemática (6º ano)</h1>
      <p className="mt-2 text-slate-600">
        Protótipo do tutor de IA que responde dúvidas ancorado no livro didático e na BNCC.
      </p>
      <Link
        href="/tutor"
        className="mt-6 inline-block rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Abrir o tutor
      </Link>
    </main>
  );
}
