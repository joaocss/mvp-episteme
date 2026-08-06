"use client";

// Renderiza a resposta do tutor em markdown, substituindo blocos ```viz {json}```
// por diagramas SVG deterministicos (DiagramaEpisteme). Assim a IA "ilustra"
// pedindo um diagrama, e o app desenha sempre correto. JSON invalido ou tipo
// desconhecido degrada (mostra o bloco cru / nada), nunca quebra a resposta.
import * as React from "react";
import ReactMarkdown from "react-markdown";
import { DiagramaEpisteme, type EspecViz } from "./DiagramaEpisteme";

const RE_VIZ = /```viz\s*([\s\S]*?)```/g;

export default function RespostaRica({ texto }: { texto: string }) {
  const partes: React.ReactNode[] = [];
  let ultimo = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  RE_VIZ.lastIndex = 0;
  while ((m = RE_VIZ.exec(texto)) !== null) {
    const md = texto.slice(ultimo, m.index);
    if (md.trim()) partes.push(<ReactMarkdown key={`md${i}`}>{md}</ReactMarkdown>);
    let espec: EspecViz | null = null;
    try { espec = JSON.parse(m[1].trim()); } catch { espec = null; }
    if (espec) partes.push(<DiagramaEpisteme key={`viz${i}`} espec={espec} />);
    ultimo = m.index + m[0].length;
    i++;
  }
  const resto = texto.slice(ultimo);
  if (resto.trim()) partes.push(<ReactMarkdown key="mdfim">{resto}</ReactMarkdown>);
  return <>{partes}</>;
}
