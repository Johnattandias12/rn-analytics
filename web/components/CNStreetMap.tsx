/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export type MapPoint = {
  nr: string;
  nome: string;
  bairro: string;
  lat: number;
  long: number;
  eleitores: number;
  n_secoes: number;
  value: number;
};

// cor: azul claro -> royal -> navy, com dourado no topo (mesma escala do mapa esquemático)
function colorFor(t: number) {
  if (t > 0.82) return "#caa106";
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${lerp(180, 12)}, ${lerp(206, 63)}, ${lerp(235, 126)})`;
}

export default function CNStreetMap({
  points,
  selected,
  onSelect,
  max,
  metricLabel,
}: {
  points: MapPoint[];
  selected: string | null;
  onSelect: (nr: string | null) => void;
  max: number;
  metricLabel: string;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  // mantém os valores atuais acessíveis dentro de handlers/closures
  const dataRef = useRef({ points, selected, onSelect, max, metricLabel });
  dataRef.current = { points, selected, onSelect, max, metricLabel };

  // inicializa o mapa uma única vez
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default as any;
      if (cancelled || !elRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(elRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      }).setView([-6.262, -36.518], 13);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      draw();
      // recalcula tamanho após render
      setTimeout(() => map.invalidateSize(), 200);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redesenha os marcadores quando os dados mudam
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, selected, max, metricLabel]);

  function draw() {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;
    const { points, selected, onSelect, max, metricLabel } = dataRef.current;
    layer.clearLayers();
    const bounds: [number, number][] = [];
    for (const p of points) {
      const t = Math.min(1, p.value / (max || 1));
      const r = 8 + Math.sqrt(t) * 22;
      const isSel = selected === p.nr;
      const marker = L.circleMarker([p.lat, p.long], {
        radius: r,
        color: isSel ? "#0b1020" : "#ffffff",
        weight: isSel ? 3 : 1.6,
        fillColor: colorFor(t),
        fillOpacity: 0.82,
      });
      marker.bindPopup(
        `<div style="font-family:system-ui,sans-serif;min-width:160px">
           <b style="color:#182551;font-size:13px">${p.nome}</b><br>
           <span style="color:#767f93;font-size:11px">${p.bairro || ""} · ${p.n_secoes} seções</span><br>
           <b style="color:#0c529a;font-size:13px">${metricLabel}: ${p.value.toLocaleString("pt-BR")}</b><br>
           <span style="color:#767f93;font-size:11px">${p.eleitores.toLocaleString("pt-BR")} eleitores</span>
         </div>`
      );
      marker.on("click", () => onSelect(isSel ? null : p.nr));
      marker.addTo(layer);
      bounds.push([p.lat, p.long]);
    }
    if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }

  return <div ref={elRef} className="w-full rounded-xl overflow-hidden border border-[color:var(--line)]" style={{ height: 460, zIndex: 0 }} />;
}
