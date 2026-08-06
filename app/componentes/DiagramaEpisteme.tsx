"use client";

// Diagramas DETERMINISTICOS (SVG) que o tutor de IA pode invocar para ilustrar
// uma explicacao. A IA nao "desenha" (modelos de imagem erram matematica): ela
// descreve o que ilustrar num bloco ```viz {json}``` e ESTE componente desenha,
// sempre correto. Voltado a series iniciais: reta numerica, fracao, agrupamento
// e barras. Cores da marca (roxo/dourado).
import * as React from "react";

const ROXO = "#3B2C63";
const DOURADO = "#C79A3B";
const BORDA = "#C9C4DA";
const TEXTO = "#2A2540";

export interface EspecViz {
  tipo?: string;
  titulo?: string;
  // reta_numerica
  de?: number; ate?: number; passo?: number; marcar?: number[];
  // fracao
  numerador?: number; denominador?: number; forma?: "barra" | "pizza";
  // grupos
  total?: number; porGrupo?: number; emoji?: string;
  // barras
  dados?: { rotulo: string; valor: number }[];
}

function Moldura({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <figure className="my-2 overflow-x-auto rounded-lg border border-borda bg-white p-3">
      {titulo && <figcaption className="mb-1 text-xs font-medium text-slate-500">{titulo}</figcaption>}
      {children}
    </figure>
  );
}

function RetaNumerica({ de = 0, ate = 10, passo = 1, marcar = [] }: EspecViz) {
  const ini = Math.min(de, ate), fim = Math.max(de, ate);
  const p = passo && passo > 0 ? passo : 1;
  const pontos: number[] = [];
  for (let v = ini; v <= fim + 1e-9; v += p) pontos.push(Math.round(v * 100) / 100);
  const larg = 320, esq = 16, dir = larg - 16, y = 34;
  const x = (v: number) => esq + ((v - ini) / (fim - ini || 1)) * (dir - esq);
  return (
    <svg viewBox={`0 0 ${larg} 60`} className="h-auto w-full max-w-md" role="img" aria-label={`Reta numerica de ${ini} a ${fim}`}>
      <line x1={esq} y1={y} x2={dir} y2={y} stroke={ROXO} strokeWidth={2} />
      <polygon points={`${dir},${y} ${dir - 6},${y - 4} ${dir - 6},${y + 4}`} fill={ROXO} />
      {pontos.map((v) => (
        <g key={v}>
          <line x1={x(v)} y1={y - 5} x2={x(v)} y2={y + 5} stroke={ROXO} strokeWidth={1.5} />
          <text x={x(v)} y={y + 18} textAnchor="middle" fontSize={10} fill={TEXTO}>{v}</text>
        </g>
      ))}
      {marcar.map((v) => (
        <circle key={`m${v}`} cx={x(v)} cy={y} r={6} fill={DOURADO} stroke="white" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

function Fracao({ numerador = 0, denominador = 1, forma = "barra" }: EspecViz) {
  const d = Math.max(1, Math.min(denominador, 24));
  const n = Math.max(0, Math.min(numerador, d));
  if (forma === "pizza") {
    const cx = 50, cy = 50, r = 42;
    const setor = (i: number) => {
      const a0 = (i / d) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / d) * 2 * Math.PI - Math.PI / 2;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const grande = a1 - a0 > Math.PI ? 1 : 0;
      return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${grande} 1 ${x1} ${y1} Z`;
    };
    return (
      <svg viewBox="0 0 100 100" className="h-auto w-40" role="img" aria-label={`Fracao ${n} de ${d}`}>
        {Array.from({ length: d }, (_, i) => (
          <path key={i} d={setor(i)} fill={i < n ? DOURADO : "white"} stroke={ROXO} strokeWidth={1.2} />
        ))}
      </svg>
    );
  }
  const larg = 300, alt = 44;
  const w = larg / d;
  return (
    <svg viewBox={`0 0 ${larg} ${alt}`} className="h-auto w-full max-w-sm" role="img" aria-label={`Fracao ${n} de ${d}`}>
      {Array.from({ length: d }, (_, i) => (
        <rect key={i} x={i * w} y={2} width={w} height={alt - 4} fill={i < n ? DOURADO : "white"} stroke={ROXO} strokeWidth={1.5} />
      ))}
    </svg>
  );
}

function Grupos({ total = 0, porGrupo = 1, emoji = "●" }: EspecViz) {
  const t = Math.max(0, Math.min(total, 60));
  const g = Math.max(1, porGrupo);
  const grupos: number[][] = [];
  for (let i = 0; i < t; i += g) grupos.push(Array.from({ length: Math.min(g, t - i) }, (_, k) => i + k));
  return (
    <div className="flex flex-wrap gap-2">
      {grupos.map((grupo, i) => (
        <div key={i} className="rounded-lg border-2 border-dashed border-roxo/50 p-1.5 text-lg leading-none">
          {grupo.map((k) => <span key={k}>{emoji}</span>)}
        </div>
      ))}
    </div>
  );
}

function Barras({ dados = [] }: EspecViz) {
  const ds = dados.slice(0, 12);
  const max = ds.reduce((m, d) => Math.max(m, d.valor), 0) || 1;
  const larg = 300, alt = 130, base = 100, bw = ds.length ? (larg - 20) / ds.length : 20;
  return (
    <svg viewBox={`0 0 ${larg} ${alt}`} className="h-auto w-full max-w-md" role="img" aria-label="Grafico de barras">
      <line x1={12} y1={base} x2={larg - 8} y2={base} stroke={BORDA} strokeWidth={1} />
      {ds.map((d, i) => {
        const h = (d.valor / max) * (base - 12);
        const x = 14 + i * bw;
        return (
          <g key={i}>
            <rect x={x} y={base - h} width={bw * 0.66} height={h} rx={3} fill={ROXO} />
            <text x={x + bw * 0.33} y={base + 12} textAnchor="middle" fontSize={9} fill={TEXTO}>{d.rotulo}</text>
            <text x={x + bw * 0.33} y={base - h - 3} textAnchor="middle" fontSize={9} fill={TEXTO}>{d.valor}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function DiagramaEpisteme({ espec }: { espec: EspecViz }) {
  let corpo: React.ReactNode = null;
  switch (espec.tipo) {
    case "reta_numerica": corpo = <RetaNumerica {...espec} />; break;
    case "fracao": corpo = <Fracao {...espec} />; break;
    case "grupos": corpo = <Grupos {...espec} />; break;
    case "barras": corpo = <Barras {...espec} />; break;
    default: return null; // tipo desconhecido: nao renderiza nada (degrada)
  }
  return <Moldura titulo={espec.titulo}>{corpo}</Moldura>;
}
