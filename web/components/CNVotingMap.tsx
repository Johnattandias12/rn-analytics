"use client";

import { useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, Geometry } from "geojson";

export type Local = { nr: string; nome: string; bairro: string; endereco: string; lat: number | null; long: number | null; eleitores: number; n_secoes: number; vereador_total: number; prefeito_total: number };

type Props = {
  boundary: Feature<Geometry, { codarea: string }>;
  locais: Local[];
  valueFor: (nr: string) => number;
  max: number;
  selected: string | null;
  onSelect: (nr: string | null) => void;
  metricLabel: string;
};

const W = 640, H = 560;

export default function CNVotingMap({ boundary, locais, valueFor, max, selected, onSelect, metricLabel }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const { pathD, project } = useMemo(() => {
    const proj = geoMercator().fitExtent([[30, 30], [W - 30, H - 30]], boundary as unknown as never);
    return { pathD: geoPath(proj)(boundary as never) ?? "", project: proj };
  }, [boundary]);

  const pts = useMemo(() => {
    return locais
      .filter((l) => l.lat != null && l.long != null)
      .map((l) => {
        const xy = project([l.long as number, l.lat as number]);
        return { l, x: xy?.[0] ?? 0, y: xy?.[1] ?? 0 };
      });
  }, [locais, project]);

  const rFor = (v: number) => 7 + Math.sqrt(v / (max || 1)) * 26;
  const colorFor = (v: number) => {
    const t = Math.min(1, v / (max || 1));
    // azul claro -> royal -> navy, com dourado no topo
    if (t > 0.82) return "#caa106";
    const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
    return `rgb(${lerp(180, 12)}, ${lerp(206, 63)}, ${lerp(235, 126)})`;
  };

  const active = hover ?? selected;
  const ptActive = pts.find((p) => p.l.nr === active);

  return (
    <div className="relative" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPos({ x: e.clientX - r.left, y: e.clientY - r.top }); }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
        <defs>
          <radialGradient id="cnGlow" cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#f0f5fc" />
            <stop offset="100%" stopColor="#e3ebf6" />
          </radialGradient>
        </defs>
        <path d={pathD} fill="url(#cnGlow)" stroke="#0c529a" strokeWidth="1.6" strokeLinejoin="round" />
        {pts.sort((a, b) => valueFor(a.l.nr) - valueFor(b.l.nr)).map((p) => {
          const v = valueFor(p.l.nr);
          const isOn = active === p.l.nr;
          return (
            <g key={p.l.nr} onMouseEnter={() => setHover(p.l.nr)} onMouseLeave={() => setHover(null)} onClick={() => onSelect(p.l.nr)} style={{ cursor: "pointer" }}>
              <circle cx={p.x} cy={p.y} r={rFor(v)} fill={colorFor(v)} fillOpacity={0.78} stroke={isOn ? "#0b1020" : "#fff"} strokeWidth={isOn ? 2.5 : 1.5} />
              {rFor(v) > 14 && <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" style={{ pointerEvents: "none" }}>{v}</text>}
            </g>
          );
        })}
      </svg>

      {ptActive && (
        <div className="glass pointer-events-none absolute z-20 rounded-xl px-3 py-2 shadow-lg max-w-[240px]" style={{ left: Math.min(pos.x + 14, W - 10), top: pos.y + 14, transform: pos.x > W * 0.55 ? "translateX(-108%)" : "none" }}>
          <div className="text-[13px] font-bold text-[color:var(--navy)] leading-tight">{ptActive.l.nome}</div>
          <div className="text-[11px] text-[color:var(--muted)]">{ptActive.l.bairro || ptActive.l.endereco}</div>
          <div className="text-xs mt-1 text-[color:var(--royal)] font-bold tnum">{metricLabel}: {valueFor(ptActive.l.nr).toLocaleString("pt-BR")}</div>
          <div className="text-[11px] text-[color:var(--muted)] tnum">{ptActive.l.n_secoes} seções · {ptActive.l.eleitores.toLocaleString("pt-BR")} eleitores</div>
        </div>
      )}
    </div>
  );
}
