"use client";

// Diagramas DETERMINISTICOS (SVG/HTML) que o tutor de IA pode invocar para
// ILUSTRAR uma explicacao. A IA nao "desenha" (modelos de imagem erram
// matematica): ela descreve o que ilustrar num bloco ```viz {json}``` e ESTE
// componente desenha, sempre correto. Biblioteca v2: cobre o fundamental inteiro
// (matematica, ciencias, historia, e visuais gerais). Cores da marca.
import * as React from "react";

const ROXO = "#3B2C63";
const DOURADO = "#C79A3B";
const BORDA = "#C9C4DA";
const TEXTO = "#2A2540";
const ROXO_SUAVE = "#EEE9F5";

export interface EspecViz {
  tipo?: string;
  titulo?: string;
  // reta_numerica
  de?: number; ate?: number; passo?: number; marcar?: number[];
  saltos?: { de: number; ate: number; rotulo?: string }[];
  // fracao
  numerador?: number; denominador?: number; forma?: "barra" | "pizza";
  // grupos
  total?: number; porGrupo?: number; emoji?: string;
  // barras
  dados?: { rotulo: string; valor: number }[];
  // area_modelo
  linhas?: number; colunas?: number;
  // tabela
  cabecalho?: string[]; celulas?: string[][];
  // comparacao
  tituloA?: string; itensA?: string[]; tituloB?: string; itensB?: string[];
  // passos / ciclo
  passos?: string[];
  // valor_posicional
  numero?: number;
  // figura_geometrica
  figura?: "retangulo" | "quadrado" | "triangulo"; largura?: number; altura?: number; base?: number;
  // plano_cartesiano
  pontos?: { x: number; y: number; rotulo?: string }[]; ligar?: boolean;
  // venn
  a?: string; b?: string; apenasA?: string; apenasB?: string; ambos?: string;
  // mapa_conceitual
  centro?: string; ramos?: string[];
  // linha_do_tempo
  eventos?: { ano?: number | string; rotulo: string }[];
}

function Moldura({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <figure className="my-2 overflow-x-auto rounded-lg border border-borda bg-white p-3">
      {titulo && <figcaption className="mb-1.5 text-xs font-medium text-slate-500">{titulo}</figcaption>}
      {children}
    </figure>
  );
}

// Rotulo curto centrado num ponto, com fundo (usa foreignObject p/ quebra de linha).
function Etiqueta({ x, y, w, h, texto, fill = ROXO_SUAVE }: { x: number; y: number; w: number; h: number; texto: string; fill?: string }) {
  return (
    <foreignObject x={x - w / 2} y={y - h / 2} width={w} height={h}>
      <div
        style={{
          width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center",
          textAlign: "center", fontSize: 10, lineHeight: 1.1, color: TEXTO, background: fill,
          border: `1px solid ${ROXO}`, borderRadius: 8, padding: 2, boxSizing: "border-box", overflow: "hidden",
        }}
      >
        {texto}
      </div>
    </foreignObject>
  );
}

/* ============================ MATEMATICA ============================ */

function RetaNumerica({ de = 0, ate = 10, passo = 1, marcar = [], saltos = [] }: EspecViz) {
  const ini = Math.min(de, ate), fim = Math.max(de, ate);
  const p = passo && passo > 0 ? passo : 1;
  const pontos: number[] = [];
  for (let v = ini; v <= fim + 1e-9; v += p) pontos.push(Math.round(v * 100) / 100);
  const larg = 340, esq = 16, dir = larg - 16, y = saltos.length ? 46 : 34;
  const x = (v: number) => esq + ((v - ini) / (fim - ini || 1)) * (dir - esq);
  return (
    <svg viewBox={`0 0 ${larg} ${y + 26}`} className="h-auto w-full max-w-md" role="img" aria-label={`Reta numerica de ${ini} a ${fim}`}>
      <line x1={esq} y1={y} x2={dir} y2={y} stroke={ROXO} strokeWidth={2} />
      <polygon points={`${dir},${y} ${dir - 6},${y - 4} ${dir - 6},${y + 4}`} fill={ROXO} />
      {pontos.map((v) => (
        <g key={v}>
          <line x1={x(v)} y1={y - 5} x2={x(v)} y2={y + 5} stroke={ROXO} strokeWidth={1.5} />
          <text x={x(v)} y={y + 18} textAnchor="middle" fontSize={10} fill={TEXTO}>{v}</text>
        </g>
      ))}
      {saltos.map((s, i) => {
        const x0 = x(s.de), x1 = x(s.ate), mx = (x0 + x1) / 2;
        return (
          <g key={`s${i}`}>
            <path d={`M ${x0} ${y - 3} Q ${mx} ${y - 26} ${x1} ${y - 3}`} fill="none" stroke={DOURADO} strokeWidth={2} />
            <polygon points={`${x1},${y - 3} ${x1 - 4},${y - 9} ${x1 + 4},${y - 9}`} fill={DOURADO} />
            {s.rotulo && <text x={mx} y={y - 28} textAnchor="middle" fontSize={9} fill={ROXO}>{s.rotulo}</text>}
          </g>
        );
      })}
      {marcar.map((v) => <circle key={`m${v}`} cx={x(v)} cy={y} r={6} fill={DOURADO} stroke="white" strokeWidth={1.5} />)}
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
  const larg = 300, alt = 44, w = larg / d;
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
        const h = (d.valor / max) * (base - 12), x = 14 + i * bw;
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

function AreaModelo({ linhas = 1, colunas = 1 }: EspecViz) {
  const r = Math.max(1, Math.min(Math.floor(linhas), 12));
  const c = Math.max(1, Math.min(Math.floor(colunas), 12));
  const cell = 20, gap = 3, W = c * (cell + gap) + gap, H = r * (cell + gap) + gap;
  return (
    <svg viewBox={`0 0 ${Math.max(W, 120)} ${H + 18}`} className="h-auto w-full max-w-xs" role="img" aria-label={`${r} por ${c}`}>
      {Array.from({ length: r }).map((_, i) =>
        Array.from({ length: c }).map((_, j) => (
          <rect key={`${i}-${j}`} x={gap + j * (cell + gap)} y={gap + i * (cell + gap)} width={cell} height={cell} rx={3} fill={DOURADO} opacity={0.85} stroke={ROXO} strokeWidth={0.8} />
        )),
      )}
      <text x={Math.max(W, 120) / 2} y={H + 13} textAnchor="middle" fontSize={11} fill={TEXTO}>{r} × {c} = {r * c}</text>
    </svg>
  );
}

function ValorPosicional({ numero = 0 }: EspecViz) {
  const n = Math.max(0, Math.min(Math.floor(numero), 9999));
  const casas = [
    { nome: "Milhar", div: 1000 }, { nome: "Centena", div: 100 },
    { nome: "Dezena", div: 10 }, { nome: "Unidade", div: 1 },
  ];
  const digitos = casas.map((c) => Math.floor(n / c.div) % 10);
  let inicio = digitos.findIndex((d) => d > 0);
  if (inicio === -1) inicio = casas.length - 1;
  return (
    <div className="flex flex-wrap items-end gap-2">
      {casas.slice(inicio).map((c, k) => {
        const idx = inicio + k;
        return (
          <div key={c.nome} className="text-center">
            <div className="rounded-t-md bg-roxo/10 px-2 py-0.5 text-[10px] font-medium text-roxo">{c.nome}</div>
            <div className="rounded-b-md border border-t-0 border-borda px-3 py-1 text-2xl font-bold text-grafite">{digitos[idx]}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">{digitos[idx] * c.div}</div>
          </div>
        );
      })}
      <div className="pb-2 text-sm font-medium text-slate-500">= {n}</div>
    </div>
  );
}

function FiguraGeometrica({ figura = "retangulo", largura = 4, altura = 3, base }: EspecViz) {
  const lado = Math.max(0.1, largura);
  const b = Math.max(0.1, base ?? largura);
  const h = Math.max(0.1, figura === "quadrado" ? largura : altura);
  const maxDim = Math.max(lado, h, b);
  const esc = 120 / maxDim, pad = 30;
  if (figura === "triangulo") {
    const w = b * esc, ht = altura * esc, W = w + 2 * pad, H = ht + 2 * pad, area = (b * altura) / 2;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-xs" role="img" aria-label="triangulo">
        <polygon points={`${pad},${pad + ht} ${pad + w},${pad + ht} ${pad},${pad}`} fill={DOURADO} opacity={0.75} stroke={ROXO} strokeWidth={1.5} />
        <text x={pad + w / 2} y={pad + ht + 15} textAnchor="middle" fontSize={11} fill={TEXTO}>base {b}</text>
        <text x={pad - 5} y={pad + ht / 2} textAnchor="end" fontSize={11} fill={TEXTO}>altura {altura}</text>
        <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={10} fill={ROXO}>área = {b}×{altura}÷2 = {Math.round(area * 100) / 100}</text>
      </svg>
    );
  }
  const w = (figura === "quadrado" ? lado : lado) * esc;
  const hh = h * esc, W = w + 2 * pad, H = hh + 2 * pad;
  const larguraReal = lado, alturaReal = figura === "quadrado" ? lado : altura;
  const area = larguraReal * alturaReal, perim = 2 * (larguraReal + alturaReal);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-xs" role="img" aria-label={figura}>
      <rect x={pad} y={pad} width={w} height={hh} fill={DOURADO} opacity={0.75} stroke={ROXO} strokeWidth={1.5} />
      <text x={pad + w / 2} y={pad + hh + 15} textAnchor="middle" fontSize={11} fill={TEXTO}>{larguraReal}</text>
      <text x={pad - 5} y={pad + hh / 2} textAnchor="end" fontSize={11} fill={TEXTO}>{alturaReal}</text>
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={10} fill={ROXO}>área = {area} · perímetro = {perim}</text>
    </svg>
  );
}

function PlanoCartesiano({ de = -5, ate = 5, pontos = [], ligar = false }: EspecViz) {
  const min = Math.min(de, ate), max = Math.max(de, ate), span = max - min || 1;
  const size = 210, pad = 18;
  const sx = (x: number) => pad + ((x - min) / span) * (size - 2 * pad);
  const sy = (y: number) => size - pad - ((y - min) / span) * (size - 2 * pad);
  const ticks: number[] = [];
  for (let v = Math.ceil(min); v <= max; v++) ticks.push(v);
  const temEixoX = min <= 0 && max >= 0, temEixoY = min <= 0 && max >= 0;
  const pts = pontos.slice(0, 12);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-xs" role="img" aria-label="Plano cartesiano">
      {ticks.map((v) => (
        <g key={`g${v}`}>
          <line x1={sx(v)} y1={pad} x2={sx(v)} y2={size - pad} stroke={BORDA} strokeWidth={0.5} />
          <line x1={pad} y1={sy(v)} x2={size - pad} y2={sy(v)} stroke={BORDA} strokeWidth={0.5} />
        </g>
      ))}
      {temEixoX && <line x1={pad} y1={sy(0)} x2={size - pad} y2={sy(0)} stroke={ROXO} strokeWidth={1.5} />}
      {temEixoY && <line x1={sx(0)} y1={pad} x2={sx(0)} y2={size - pad} stroke={ROXO} strokeWidth={1.5} />}
      {ligar && pts.length > 1 && (
        <polyline points={pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")} fill="none" stroke={DOURADO} strokeWidth={2} />
      )}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={sx(p.x)} cy={sy(p.y)} r={4} fill={DOURADO} stroke={ROXO} strokeWidth={1} />
          <text x={sx(p.x) + 5} y={sy(p.y) - 4} fontSize={9} fill={ROXO}>{p.rotulo ?? `(${p.x},${p.y})`}</text>
        </g>
      ))}
    </svg>
  );
}

/* ============================ CIENCIAS / GERAIS ============================ */

function Ciclo({ passos = [] }: EspecViz) {
  const ps = passos.slice(0, 6).filter(Boolean);
  const n = ps.length || 1;
  const size = 230, cx = size / 2, cy = size / 2, R = 82, bw = 74, bh = 34;
  const pos = (i: number) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-xs" role="img" aria-label="Ciclo">
      {ps.map((_, i) => {
        const p0 = pos(i), p1 = pos((i + 1) % n);
        const mx = (p0.x + p1.x) / 2 + (cy - (p0.y + p1.y) / 2) * 0.12;
        const my = (p0.y + p1.y) / 2 + ((p0.x + p1.x) / 2 - cx) * 0.12;
        return <path key={`a${i}`} d={`M ${p0.x} ${p0.y} Q ${mx} ${my} ${p1.x} ${p1.y}`} fill="none" stroke={DOURADO} strokeWidth={1.5} markerEnd="url(#seta)" />;
      })}
      <defs>
        <marker id="seta" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DOURADO} />
        </marker>
      </defs>
      {ps.map((t, i) => {
        const p = pos(i);
        return <Etiqueta key={i} x={p.x} y={p.y} w={bw} h={bh} texto={t} />;
      })}
    </svg>
  );
}

function MapaConceitual({ centro = "", ramos = [] }: EspecViz) {
  const rs = ramos.slice(0, 6).filter(Boolean);
  const n = rs.length || 1;
  const size = 240, cx = size / 2, cy = size / 2, R = 88, bw = 76, bh = 32;
  const pos = (i: number) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-sm" role="img" aria-label="Mapa conceitual">
      {rs.map((_, i) => {
        const p = pos(i);
        return <line key={`l${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={BORDA} strokeWidth={1.5} />;
      })}
      {rs.map((t, i) => { const p = pos(i); return <Etiqueta key={i} x={p.x} y={p.y} w={bw} h={bh} texto={t} />; })}
      <Etiqueta x={cx} y={cy} w={88} h={38} texto={centro} fill={ROXO} />
      {/* rotulo central em branco por cima */}
      <foreignObject x={cx - 44} y={cy - 19} width={88} height={38}>
        <div style={{ width: 88, height: 38, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 11, fontWeight: 700, color: "white", lineHeight: 1.1, padding: 2, boxSizing: "border-box" }}>{centro}</div>
      </foreignObject>
    </svg>
  );
}

function Venn({ a = "A", b = "B", apenasA = "", apenasB = "", ambos = "" }: EspecViz) {
  const W = 300, H = 170, r = 62, cyc = 78, cxa = 100, cxb = 200;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-md" role="img" aria-label="Diagrama de Venn">
      <circle cx={cxa} cy={cyc} r={r} fill={ROXO} opacity={0.14} stroke={ROXO} strokeWidth={1.5} />
      <circle cx={cxb} cy={cyc} r={r} fill={DOURADO} opacity={0.18} stroke={DOURADO} strokeWidth={1.5} />
      <text x={cxa} y={18} textAnchor="middle" fontSize={12} fontWeight={700} fill={ROXO}>{a}</text>
      <text x={cxb} y={18} textAnchor="middle" fontSize={12} fontWeight={700} fill={DOURADO}>{b}</text>
      <foreignObject x={cxa - 58} y={cyc - 22} width={52} height={44}><div style={boxTxt}>{apenasA}</div></foreignObject>
      <foreignObject x={cxb + 6} y={cyc - 22} width={52} height={44}><div style={boxTxt}>{apenasB}</div></foreignObject>
      <foreignObject x={150 - 26} y={cyc - 22} width={52} height={44}><div style={{ ...boxTxt, fontWeight: 600 }}>{ambos}</div></foreignObject>
    </svg>
  );
}
const boxTxt: React.CSSProperties = { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 9, lineHeight: 1.05, color: TEXTO, overflow: "hidden" };

function LinhaDoTempo({ eventos = [] }: EspecViz) {
  const evs = eventos.filter((e) => e && e.rotulo).slice(0, 8);
  const n = evs.length || 1;
  const W = Math.max(320, n * 90), H = 120, y = 60, esq = 30, dir = W - 30;
  const x = (i: number) => esq + (i / Math.max(1, n - 1)) * (dir - esq);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Linha do tempo">
      <line x1={esq} y1={y} x2={dir} y2={y} stroke={ROXO} strokeWidth={2} />
      <polygon points={`${dir},${y} ${dir - 7},${y - 4} ${dir - 7},${y + 4}`} fill={ROXO} />
      {evs.map((e, i) => {
        const cx = n === 1 ? (esq + dir) / 2 : x(i), acima = i % 2 === 0;
        const ty = acima ? y - 34 : y + 12;
        return (
          <g key={i}>
            <circle cx={cx} cy={y} r={5} fill={DOURADO} stroke="white" strokeWidth={1.5} />
            {e.ano != null && <text x={cx} y={acima ? y - 20 : y + 40} textAnchor="middle" fontSize={10} fontWeight={700} fill={ROXO}>{e.ano}</text>}
            <foreignObject x={cx - 42} y={ty} width={84} height={26}>
              <div style={{ ...boxTxt, fontSize: 9 }}>{e.rotulo}</div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}

/* ============================ HTML (texto/estrutura) ============================ */

function Tabela({ cabecalho = [], celulas = [] }: EspecViz) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {cabecalho.length > 0 && (
          <thead>
            <tr>{cabecalho.map((c, i) => <th key={i} className="border border-borda bg-roxo/10 px-2 py-1 text-left font-semibold text-grafite">{c}</th>)}</tr>
          </thead>
        )}
        <tbody>
          {celulas.map((lin, i) => (
            <tr key={i}>{lin.map((cel, j) => <td key={j} className="border border-borda px-2 py-1 text-grafite">{cel}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Comparacao({ tituloA = "", itensA = [], tituloB = "", itensB = [] }: EspecViz) {
  const Col = ({ titulo, itens }: { titulo: string; itens: string[] }) => (
    <div className="rounded-lg border border-borda p-2">
      <p className="mb-1 border-b border-borda pb-1 text-sm font-semibold text-roxo">{titulo}</p>
      <ul className="list-disc space-y-0.5 pl-4 text-sm text-grafite">{itens.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
  return <div className="grid grid-cols-2 gap-2"><Col titulo={tituloA} itens={itensA} /><Col titulo={tituloB} itens={itensB} /></div>;
}

function Passos({ passos = [] }: EspecViz) {
  return (
    <ol className="space-y-1.5">
      {passos.slice(0, 10).map((p, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-grafite">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-roxo text-xs font-bold text-white">{i + 1}</span>
          <span className="pt-0.5">{p}</span>
        </li>
      ))}
    </ol>
  );
}

export function DiagramaEpisteme({ espec }: { espec: EspecViz }) {
  let corpo: React.ReactNode = null;
  switch (espec.tipo) {
    case "reta_numerica": corpo = <RetaNumerica {...espec} />; break;
    case "fracao": corpo = <Fracao {...espec} />; break;
    case "grupos": corpo = <Grupos {...espec} />; break;
    case "barras": corpo = <Barras {...espec} />; break;
    case "area_modelo": corpo = <AreaModelo {...espec} />; break;
    case "valor_posicional": corpo = <ValorPosicional {...espec} />; break;
    case "figura_geometrica": corpo = <FiguraGeometrica {...espec} />; break;
    case "plano_cartesiano": corpo = <PlanoCartesiano {...espec} />; break;
    case "ciclo": corpo = <Ciclo {...espec} />; break;
    case "mapa_conceitual": corpo = <MapaConceitual {...espec} />; break;
    case "venn": corpo = <Venn {...espec} />; break;
    case "linha_do_tempo": corpo = <LinhaDoTempo {...espec} />; break;
    case "tabela": corpo = <Tabela {...espec} />; break;
    case "comparacao": corpo = <Comparacao {...espec} />; break;
    case "passos": corpo = <Passos {...espec} />; break;
    default: return null; // tipo desconhecido: degrada, nao quebra
  }
  return <Moldura titulo={espec.titulo}>{corpo}</Moldura>;
}
