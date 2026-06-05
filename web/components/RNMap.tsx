"use client";

import { useMemo } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";

type Props = {
  geo: FeatureCollection<Geometry, { codarea: string }>;
  values: Map<number, number | null>;
  colorFor: (v: number | null | undefined) => string;
  seridoSet: Set<number>;
  selected: number | null;
  onSelect: (codigo: number) => void;
  onHover?: (codigo: number | null) => void;
};

const W = 900;
const H = 680;

export default function RNMap({ geo, values, colorFor, seridoSet, selected, onSelect, onHover }: Props) {
  const path = useMemo(() => {
    const proj = geoMercator().fitExtent(
      [
        [16, 16],
        [W - 16, H - 16],
      ],
      geo as unknown as never
    );
    return geoPath(proj);
  }, [geo]);

  // desenha o Seridó por cima para o contorno dourado ficar visível
  const ordered = useMemo(() => {
    const feats = geo.features.map((f, i) => ({ f, i }));
    return feats.sort((a, b) => {
      const sa = seridoSet.has(Number(a.f.properties.codarea)) ? 1 : 0;
      const sb = seridoSet.has(Number(b.f.properties.codarea)) ? 1 : 0;
      return sa - sb;
    });
  }, [geo, seridoSet]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Mapa dos municípios do RN">
      <g>
        {ordered.map(({ f, i }) => {
          const cod = Number(f.properties.codarea);
          const d = path(f as never) ?? "";
          const isSer = seridoSet.has(cod);
          const isSel = selected === cod;
          return (
            <path
              key={cod || i}
              d={d}
              className={`muni${isSel ? " selected" : ""}`}
              fill={colorFor(values.get(cod))}
              stroke={isSel ? "var(--navy)" : isSer ? "var(--gold)" : "#ffffff"}
              strokeWidth={isSel ? 2.2 : isSer ? 1.1 : 0.6}
              onClick={() => onSelect(cod)}
              onMouseEnter={() => onHover?.(cod)}
              onMouseLeave={() => onHover?.(null)}
            >
              <title>{f.properties.codarea}</title>
            </path>
          );
        })}
      </g>
    </svg>
  );
}
