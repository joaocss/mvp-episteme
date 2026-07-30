"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Marca } from "../componentes/Marca";

interface Mensagem {
  autor: "aluno" | "tutor";
  texto: string;
  opcoes?: string[];
  origemResposta?: "livro" | "bncc" | "conhecimento_geral" | "imagem";
  imagemPreview?: string;
}

const RotuloOrigem: Record<string, string> = {
  bncc: "📘 Baseado na BNCC (não está no livro da turma)",
  conhecimento_geral: "🌐 Conhecimento geral (não está no material da escola)",
  imagem: "📷 Baseado na imagem enviada (não está no material da escola)",
};

const ROTULO_DISCIPLINA: Record<string, string> = {
  matematica: "Matemática", portugues: "Língua Portuguesa", historia: "História",
};

const TAMANHO_MAX_IMAGEM = 4_500_000; // bytes, antes de virar base64

interface ResumoSessao { sessaoId: string; perguntas: number; iniciada: string; }

export default function PaginaTutor() {
  const [pergunta, setPergunta] = useState("");
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [temaQuestoes, setTemaQuestoes] = useState<string>("");
  const [historico, setHistorico] = useState<ResumoSessao[]>([]);
  const [imagem, setImagem] = useState<string | null>(null);
  const [erroImagem, setErroImagem] = useState("");
  const [serie, setSerie] = useState("");
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [disciplina, setDisciplina] = useState("matematica");
  const fimDaConversa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/tutor/disciplinas").then((r) => r.json()).then((d) => {
      setSerie(d.serie ?? "");
      setDisciplinas(d.disciplinas ?? ["matematica"]);
      if (d.disciplinas?.length) setDisciplina(d.disciplinas[0]);
    }).catch(() => {});
  }, []);

  function escolherImagem(arquivo: File | undefined) {
    setErroImagem("");
    if (!arquivo) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(arquivo.type)) { setErroImagem("Envie uma imagem PNG, JPG ou WEBP."); return; }
    if (arquivo.size > TAMANHO_MAX_IMAGEM) { setErroImagem("Imagem muito grande (máx. ~4,5MB)."); return; }
    const leitor = new FileReader();
    leitor.onload = () => setImagem(leitor.result as string);
    leitor.readAsDataURL(arquivo);
  }

  useEffect(() => { fimDaConversa.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens]);

  async function carregarHistorico() {
    try {
      const r = await fetch("/api/tutor/historico");
      if (r.ok) { const d = await r.json(); setHistorico(d.sessoes ?? []); }
    } catch { /* silencioso */ }
  }
  useEffect(() => { carregarHistorico(); }, []);

  async function abrirSessao(id: string) {
    try {
      const r = await fetch(`/api/tutor/conversa?sessao=${id}`);
      if (!r.ok) return;
      const d = await r.json();
      setMensagens((d.mensagens ?? []).map((m: { autor: string; conteudo: string; anexoImagem: string | null }) => ({
        autor: m.autor === "aluno" ? "aluno" : "tutor", texto: m.conteudo,
        imagemPreview: m.anexoImagem ?? undefined,
      })));
      if (d.disciplina) setDisciplina(d.disciplina);
      setSessaoId(id);
    } catch { /* silencioso */ }
  }

  function novaConversa() { setMensagens([]); setSessaoId(null); setPergunta(""); setTemaQuestoes(""); }

  async function enviarPergunta(texto: string) {
    const limpo = texto.trim();
    if (!limpo || carregando) return;
    const imagemEnviada = imagem;
    setMensagens((atual) => [...atual, { autor: "aluno", texto: limpo, imagemPreview: imagemEnviada ?? undefined }]);
    setPergunta("");
    setImagem(null);
    setCarregando(true);
    try {
      const resposta = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pergunta: limpo, sessaoId, imagemBase64: imagemEnviada ?? undefined, disciplina }),
      });
      const dados = await resposta.json();
      if (dados.sessaoId) setSessaoId(dados.sessaoId);
      if (dados.disciplina) setDisciplina(dados.disciplina);
      if (dados.tema) setTemaQuestoes(dados.tema);
      setMensagens((atual) => [...atual, {
        autor: "tutor",
        texto: dados.resposta ?? "Não consegui responder agora.",
        opcoes: dados.opcoes,
        origemResposta: dados.origemResposta,
      }]);
      carregarHistorico();
    } catch {
      setMensagens((atual) => [...atual, { autor: "tutor", texto: "Tive um problema para responder. Tente novamente." }]);
    } finally {
      setCarregando(false);
    }
  }

  function escolherFormato(opcao: string) {
    enviarPergunta(`${temaQuestoes} — ${opcao}`);
  }

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col bg-creme p-4">
      <Marca
        compacto
        acoes={
          <>
            <Link href="/provas" className="min-h-[44px] text-sm font-medium text-roxo hover:underline">
              Provas
            </Link>
            <button onClick={novaConversa} className="min-h-[44px] text-sm font-medium text-roxo hover:underline">
              Nova conversa
            </button>
            <form action="/auth/sair" method="post">
              <button type="submit" className="min-h-[44px] text-sm text-slate-500 hover:text-grafite">Sair</button>
            </form>
          </>
        }
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grafite">
          Tutor de {ROTULO_DISCIPLINA[disciplina] ?? disciplina}{serie ? ` — ${serie}` : ""}
        </h1>
        {!sessaoId && mensagens.length === 0 && disciplinas.length > 1 && (
          <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-roxo-claro">
            {disciplinas.map((d) => <option key={d} value={d}>{ROTULO_DISCIPLINA[d] ?? d}</option>)}
          </select>
        )}
      </div>

      {historico.length > 0 && (
        <details className="mt-3 cartao p-2">
          <summary className="cursor-pointer text-sm text-slate-600">Conversas anteriores ({historico.length})</summary>
          <ul className="mt-2 space-y-1">
            {historico.map((s) => (
              <li key={s.sessaoId}>
                <button onClick={() => abrirSessao(s.sessaoId)}
                  className="w-full rounded px-2 py-2 text-left text-sm hover:bg-creme">
                  {s.iniciada} — {s.perguntas} pergunta(s)
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className="mt-4 flex-1 space-y-3 overflow-y-auto cartao p-4"
        role="log" aria-live="polite" aria-label="Conversa com o tutor">
        {mensagens.length === 0 && <p className="text-slate-500">Escreva uma dúvida de matemática para começar.</p>}
        {mensagens.map((m, i) => (
          <div key={i} className={m.autor === "aluno" ? "text-right" : "text-left"}>
            {m.autor === "tutor" && m.origemResposta && RotuloOrigem[m.origemResposta] && (
              <p className="mb-1 text-xs text-amber-700">{RotuloOrigem[m.origemResposta]}</p>
            )}
            <span className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-left ${
              m.autor === "aluno" ? "bg-roxo text-white" : "border border-slate-200 bg-slate-50 text-grafite"}`}>
              {m.autor === "tutor" ? (
                <div className="prose-tutor">
                  <ReactMarkdown>{m.texto}</ReactMarkdown>
                </div>
              ) : (
                <>
                  {m.imagemPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imagemPreview} alt="Imagem enviada pelo aluno" className="mb-2 max-h-40 rounded-lg" />
                  )}
                  <span className="whitespace-pre-line">{m.texto}</span>
                </>
              )}
            </span>
            {m.opcoes && m.opcoes.length > 0 && !carregando && (
              <div className="mt-2 flex flex-wrap gap-2">
                {m.opcoes.map((op) => (
                  <button key={op} onClick={() => escolherFormato(op)}
                    className="min-h-[44px] rounded-full border border-roxo/30 bg-white px-4 py-1 text-sm text-roxo hover:bg-creme">
                    {op}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {carregando && <p className="text-slate-500" aria-live="assertive">Pensando…</p>}
        <div ref={fimDaConversa} />
      </section>

      {imagem && (
        <div className="mt-3 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagem} alt="Pré-visualização da imagem a enviar" className="h-14 w-14 rounded-lg object-cover" />
          <button type="button" onClick={() => setImagem(null)} className="text-sm text-slate-500 hover:text-alerta">
            remover imagem
          </button>
        </div>
      )}
      {erroImagem && <p className="mt-2 text-sm text-alerta">{erroImagem}</p>}

      <form onSubmit={(e) => { e.preventDefault(); enviarPergunta(pergunta); }} className="mt-4 flex gap-2">
        <label htmlFor="campo-pergunta" className="sr-only">Sua pergunta de matemática</label>
        <label htmlFor="campo-imagem"
          className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-lg"
          title="Anexar foto do problema">
          📷
          <input id="campo-imagem" type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
            onChange={(e) => escolherImagem(e.target.files?.[0])} />
        </label>
        <input id="campo-pergunta" value={pergunta} onChange={(e) => setPergunta(e.target.value)}
          placeholder="Escreva sua dúvida…" autoComplete="off"
          className="min-h-[44px] flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roxo-claro" />
        <button type="submit" disabled={carregando} className="btn-primario">Enviar</button>
      </form>
    </main>
  );
}
