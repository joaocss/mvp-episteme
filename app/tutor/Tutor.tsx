"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Icone } from "../componentes/ui/Icone";

interface Mensagem {
  autor: "aluno" | "tutor";
  texto: string;
  opcoes?: string[];
  origemResposta?: "livro" | "bncc" | "conhecimento_geral" | "imagem";
  imagemPreview?: string;
}

const RotuloOrigem: Record<string, string> = {
  bncc: "📘 Baseado na BNCC (nao esta no livro da turma)",
  conhecimento_geral: "🌐 Conhecimento geral (nao esta no material da escola)",
  imagem: "📷 Baseado na imagem enviada (nao esta no material da escola)",
};

const ROTULO_DISCIPLINA: Record<string, string> = {
  matematica: "Matematica", portugues: "Lingua Portuguesa", historia: "Historia",
  tecnico_administrativo: "Tecnico em Administracao",
};

const TAMANHO_MAX_IMAGEM = 4_500_000; // bytes, antes de virar base64

interface ResumoSessao { sessaoId: string; perguntas: number; iniciada: string; }

export default function Tutor() {
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
    if (arquivo.size > TAMANHO_MAX_IMAGEM) { setErroImagem("Imagem muito grande (max. ~4,5MB)."); return; }
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
        texto: dados.resposta ?? "Nao consegui responder agora.",
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
    <div className="flex flex-col">
      {/* Cabecalho do tutor */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-grafite">
            Tutor de {ROTULO_DISCIPLINA[disciplina] ?? disciplina}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {serie ? `${serie} · ` : ""}Pergunte e construa o raciocinio passo a passo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!sessaoId && mensagens.length === 0 && disciplinas.length > 1 && (
            <select
              value={disciplina}
              onChange={(e) => setDisciplina(e.target.value)}
              className="campo min-h-[40px] w-auto py-1.5"
            >
              {disciplinas.map((d) => <option key={d} value={d}>{ROTULO_DISCIPLINA[d] ?? d}</option>)}
            </select>
          )}
          <button
            onClick={novaConversa}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-roxo/20 bg-white px-3 py-1.5 text-sm font-medium text-roxo transition hover:bg-roxo-suave"
          >
            <Icone nome="mais" className="h-4 w-4" /> Nova conversa
          </button>
        </div>
      </div>

      {historico.length > 0 && (
        <details className="mt-4 cartao p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">
            Conversas anteriores ({historico.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {historico.map((s) => (
              <li key={s.sessaoId}>
                <button
                  onClick={() => abrirSessao(s.sessaoId)}
                  className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-roxo-suave/50"
                >
                  {s.iniciada} — {s.perguntas} pergunta(s)
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Area de conversa */}
      <section
        className="mt-4 flex min-h-[52vh] flex-1 flex-col space-y-3 overflow-y-auto rounded-xl border border-borda bg-superficie p-4 shadow-cartao"
        role="log"
        aria-live="polite"
        aria-label="Conversa com o tutor"
      >
        {mensagens.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-roxo-suave text-roxo">
              <Icone nome="tutor" className="h-6 w-6" />
            </span>
            <p className="mt-3 font-medium text-grafite">Como posso te ajudar hoje?</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Escreva uma duvida da sua materia para comecarmos a pensar juntos.
            </p>
          </div>
        )}
        {mensagens.map((m, i) => (
          <div key={i} className={m.autor === "aluno" ? "text-right" : "text-left"}>
            {m.autor === "tutor" && m.origemResposta && RotuloOrigem[m.origemResposta] && (
              <p className="mb-1 text-xs text-aviso">{RotuloOrigem[m.origemResposta]}</p>
            )}
            <span className={`inline-block max-w-[85%] rounded-2xl px-3.5 py-2.5 text-left ${
              m.autor === "aluno" ? "bg-roxo text-white" : "border border-borda bg-tela text-grafite"}`}>
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
                  <button
                    key={op}
                    onClick={() => escolherFormato(op)}
                    className="min-h-[44px] rounded-full border border-roxo/30 bg-white px-4 py-1 text-sm text-roxo hover:bg-roxo-suave"
                  >
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
          <img src={imagem} alt="Pre-visualizacao da imagem a enviar" className="h-14 w-14 rounded-lg object-cover" />
          <button type="button" onClick={() => setImagem(null)} className="text-sm text-slate-500 hover:text-alerta">
            remover imagem
          </button>
        </div>
      )}
      {erroImagem && <p className="mt-2 text-sm text-alerta">{erroImagem}</p>}

      <form onSubmit={(e) => { e.preventDefault(); enviarPergunta(pergunta); }} className="mt-4 flex gap-2">
        <label htmlFor="campo-pergunta" className="sr-only">Sua pergunta</label>
        <label
          htmlFor="campo-imagem"
          className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-borda text-slate-500 hover:bg-roxo-suave hover:text-roxo"
          title="Anexar foto do problema"
        >
          <Icone nome="upload" className="h-5 w-5" />
          <input id="campo-imagem" type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
            onChange={(e) => escolherImagem(e.target.files?.[0])} />
        </label>
        <input
          id="campo-pergunta"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Escreva sua duvida…"
          autoComplete="off"
          className="campo flex-1"
        />
        <button type="submit" disabled={carregando} className="btn-primario">Enviar</button>
      </form>
    </div>
  );
}
