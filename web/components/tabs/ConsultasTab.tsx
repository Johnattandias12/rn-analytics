"use client";

import { useEffect, useMemo, useState } from "react";
import type { Bundle } from "../App";
import { Card, Mini, SectionTitle } from "../ui";
import { fmtInt, fmtReaisCheio, partidoLabel } from "../../lib/data";

type Cand = { sq: string; numero: string; nome: string; partido_num: string; votos: number; rank: number; por_local: Record<string, number> };
type Local = { nr: string; nome: string; bairro: string; eleitores: number; vereador_total: number };
type CNData = { locais: Local[]; vereador: { candidatos: Cand[] } };

export default function ConsultasTab({ b }: { b: Bundle }) {
  const [cn, setCn] = useState<CNData | null>(null);
  useEffect(() => { fetch("/data/eleicao/cn/currais-novos-2024.json").then((r) => r.json()).then(setCn); }, []);

  return (
    <div className="space-y-6">
      <SectionTitle kicker="Consultas & insights" title="Cruzamento de dados" desc="Combine eleição e socioeconomia para encontrar padrões — redutos disputados, correlações e abstenção." />
      {cn ? <Comparador cn={cn} /> : <Card className="p-10 text-center text-[color:var(--muted)]">Carregando dados de Currais Novos…</Card>}
      <Correlacao b={b} />
      {cn && <Abstencao cn={cn} />}
    </div>
  );
}

/* 1) Comparador de redutos — heat matrix locais × candidatos (CN 2024 vereador) */
function Comparador({ cn }: { cn: CNData }) {
  const top = cn.vereador.candidatos.slice(0, 15);
  const [sel, setSel] = useState<string[]>(top.slice(0, 3).map((c) => c.sq));
  const cands = top.filter((c) => sel.includes(c.sq));
  const locais = cn.locais.filter((l) => l.eleitores > 0);
  const maxCell = Math.max(1, ...cands.flatMap((c) => locais.map((l) => c.por_local[l.nr] ?? 0)));

  const toggle = (sq: string) => setSel((s) => (s.includes(sq) ? s.filter((x) => x !== sq) : s.length < 4 ? [...s, sq] : s));
  const cell = (v: number) => {
    const t = v / maxCell;
    return { background: `rgba(12,82,154,${0.08 + t * 0.85})`, color: t > 0.5 ? "#fff" : "var(--ink)" };
  };

  return (
    <Card className="p-5">
      <h3 className="font-bold text-[color:var(--navy)]">Comparador de redutos · Vereadores 2024</h3>
      <p className="text-sm text-[color:var(--muted)] mb-3">Escolha até 4 candidatos e veja onde cada um é forte (votos por local).</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {top.map((c) => {
          const on = sel.includes(c.sq);
          return (
            <button key={c.sq} onClick={() => toggle(c.sq)} className="chip-i text-xs font-semibold px-2.5 py-1.5 rounded-full border"
              style={{ background: on ? "var(--navy)" : "#fff", color: on ? "#fff" : "var(--ink-2)", borderColor: on ? "var(--navy)" : "var(--line)" }}>
              {c.nome.split(" ").slice(0, 2).join(" ")} · {partidoLabel(c.partido_num)}
            </button>
          );
        })}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 font-bold text-[color:var(--muted)] sticky left-0 bg-white">Local</th>
              {cands.map((c) => <th key={c.sq} className="p-2 font-bold text-[color:var(--navy)] text-center min-w-[90px]">{c.nome.split(" ")[0]}</th>)}
            </tr>
          </thead>
          <tbody>
            {locais.map((l) => (
              <tr key={l.nr}>
                <td className="p-2 font-medium text-[color:var(--ink)] sticky left-0 bg-white truncate max-w-[160px]">{l.nome}</td>
                {cands.map((c) => {
                  const v = c.por_local[l.nr] ?? 0;
                  return <td key={c.sq} className="p-2 text-center tnum font-bold rounded" style={cell(v)}>{v || ""}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* 2) Correlação socioeconômica (Seridó): PIB per capita × competição política */
function Correlacao({ b }: { b: Bundle }) {
  const pts = useMemo(() => {
    return b.serido.municipios.map((m) => {
      const s = b.socioByCode.get(m.codigo_ibge ?? -1);
      const pop = s?.populacao_2022 ?? 0;
      const pibpc = s?.pib_per_capita_2021 ?? 0;
      const candPer10k = pop ? (m.qtd_candidatos / pop) * 10000 : 0;
      return { nome: m.nome, pibpc, candPer10k, pop };
    }).filter((p) => p.pibpc > 0 && p.candPer10k > 0);
  }, [b]);

  const corr = pearson(pts.map((p) => p.pibpc), pts.map((p) => p.candPer10k));
  const W = 560, H = 300, pad = { l: 50, r: 20, t: 20, b: 40 };
  const xs = pts.map((p) => p.pibpc), ys = pts.map((p) => p.candPer10k);
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = 0, ymax = Math.max(...ys) * 1.1;
  const X = (v: number) => pad.l + ((v - xmin) / (xmax - xmin || 1)) * (W - pad.l - pad.r);
  const Y = (v: number) => H - pad.b - ((v - ymin) / (ymax - ymin || 1)) * (H - pad.t - pad.b);

  return (
    <Card className="p-5">
      <h3 className="font-bold text-[color:var(--navy)]">Riqueza × competição política (Seridó)</h3>
      <p className="text-sm text-[color:var(--muted)] mb-1">Cada ponto é um município: PIB per capita vs. candidatos a vereador por 10 mil habitantes.</p>
      <p className="text-sm mb-3"><b style={{ color: "var(--royal)" }}>Correlação: {corr.toFixed(2)}</b> — {corrTexto(corr)}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {[0, 0.5, 1].map((g) => <line key={g} x1={pad.l} x2={W - pad.r} y1={pad.t + (H - pad.t - pad.b) * g} y2={pad.t + (H - pad.t - pad.b) * g} stroke="#eef1f7" />)}
        <text x={pad.l} y={H - 12} fontSize="10" fill="#9aa3b5">PIB/capita →</text>
        {pts.map((p) => (
          <g key={p.nome}>
            <circle cx={X(p.pibpc)} cy={Y(p.candPer10k)} r={5 + Math.sqrt(p.pop) / 30} fill="var(--royal)" fillOpacity={0.5} stroke="var(--navy)" strokeWidth="1" />
          </g>
        ))}
      </svg>
    </Card>
  );
}

/* 3) Abstenção por local (CN 2024) */
function Abstencao({ cn }: { cn: CNData }) {
  const rows = cn.locais.filter((l) => l.eleitores > 0)
    .map((l) => ({ ...l, abst: l.eleitores - l.vereador_total, taxa: ((l.eleitores - l.vereador_total) / l.eleitores) * 100 }))
    .sort((a, z) => z.taxa - a.taxa);
  const max = Math.max(...rows.map((r) => r.taxa));
  const totalEl = rows.reduce((a, r) => a + r.eleitores, 0), totalAbs = rows.reduce((a, r) => a + r.abst, 0);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-[color:var(--navy)]">Abstenção por local · 2024</h3>
          <p className="text-sm text-[color:var(--muted)]">Eleitores que não compareceram (potencial de mobilização)</p>
        </div>
        <Mini label="Abstenção geral" value={`${((totalAbs / totalEl) * 100).toFixed(1)}%`} />
      </div>
      <div className="space-y-2 mt-4">
        {rows.map((r) => (
          <div key={r.nr} className="flex items-center gap-3">
            <span className="text-xs font-medium text-[color:var(--ink)] w-44 truncate">{r.nome}</span>
            <div className="flex-1 h-4 rounded-full bg-[#eef2f8] overflow-hidden">
              <div className="h-full rounded-full flex items-center justify-end pr-2" style={{ width: `${(r.taxa / max) * 100}%`, background: "linear-gradient(90deg, var(--royal-2), var(--navy))" }}>
                <span className="text-[10px] font-bold text-white tnum">{r.taxa.toFixed(0)}%</span>
              </div>
            </div>
            <span className="text-xs tnum text-[color:var(--muted)] w-24 text-right">{fmtInt(r.abst)} de {fmtInt(r.eleitores)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function pearson(x: number[], y: number[]) {
  const n = x.length; if (!n) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; num += a * b; dx += a * a; dy += b * b; }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}
function corrTexto(c: number) {
  const a = Math.abs(c);
  const f = a < 0.2 ? "praticamente nula" : a < 0.4 ? "fraca" : a < 0.6 ? "moderada" : "forte";
  return `correlação ${f} ${c < 0 ? "negativa" : "positiva"}.`;
}
