"use client";

import { useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";

type Props = {
  geo: FeatureCollection<Geometry, { codarea: string }>;
  values: Map<number, number | null>;
  colorFor: (v: number | null | undefined) => string;
  nameFor: (cod: number) => string;
  valueLabel: (v: number | null | undefined) => string;
  seridoSet: Set<number>;
  selected: number | null;
  onSelect: (codigo: number) => void;
};

const W = 920;
const H = 700;

export default function RNMap({ geo, values, colorFor, nameFor, valueLabel, seridoSet, selected, onSelect }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const { paths } = useMemo(() => {
    const proj = geoMercator().fitExtent([[20, 20], [W - 20, H - 20]], geo as unknown as never);
    const gp = geoPath(proj);
    const paths = geo.features.map((f) => ({
      cod: Number(f.properties.codarea),
      d: gp(f as never) ?? "",
    }));
    // Seridó por último (contorno por cima)
    paths.sort((a, b) => (seridoSet.has(a.cod) ? 1 : 0) - (seridoSet.has(b.cod) ? 1 : 0));
    return { paths };
  }, [geo, seridoSet]);

  const active = hover ?? selected;

  return (
    <div
      className="relative"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label="Mapa dos municípios do RN">
        <defs>
          <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#0b1020" floodOpacity="0.12" />
          </filter>
        </defs>
        <g filter="url(#mapShadow)">
          {paths.map(({ cod, d }) => {
            const isSer = seridoSet.has(cod);
            const isSel = selected === cod;
            const isHover = hover === cod;
            return (
              <path
                key={cod}
                d={d}
                className="muni"
                fill={colorFor(values.get(cod))}
                stroke={isSel ? "#0b1020" : isHover ? "var(--gold)" : isSer ? "var(--gold)" : "#ffffff"}
                strokeWidth={isSel ? 2.4 : isHover ? 2 : isSer ? 1.2 : 0.55}
                style={{ opacity: active && !isSel && !isHover && !(isSer && !active) ? 0.92 : 1 }}
                onClick={() => onSelect(cod)}
                onMouseEnter={() => setHover(cod)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </g>
      </svg>

      {active != null && (
        <div
          className="glass pointer-events-none absolute z-20 rounded-xl px-3 py-2 shadow-lg"
          style={{ left: Math.min(pos.x + 14, W - 4), top: pos.y + 14, transform: pos.x > W * 0.6 ? "translateX(-110%)" : "none" }}
        >
          <div className="text-[13px] font-bold text-[color:var(--navy)] flex items-center gap-1.5">
            {nameFor(active)}
            {seridoSet.has(active) && <span className="text-[9px] font-bold text-[color:var(--gold)] bg-[#fff7da] px-1.5 py-0.5 rounded">SERIDÓ</span>}
          </div>
          <div className="text-xs text-[color:var(--muted)] tnum">{valueLabel(values.get(active))}</div>
        </div>
      )}
    </div>
  );
}
