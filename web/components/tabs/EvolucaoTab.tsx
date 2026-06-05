"use client";

import { useEffect, useMemo, useState } from "react";
import type { Bundle } from "../App";
import { Card, Mini, SectionTitle } from "../ui";
import { fmtInt, partidoLabel } from "../../lib/data";

type Evol = {
  meta: { anos: number[] };
  municipios: Record<string, {
    codigo_ibge: number; cd_tse: number; nome: string;
    por_ano: Record<string, { nominais: number; brancos: number; nulos: number; candidatos: number; top: { nome: string; numero: string; partido: string; votos: number }[] }>;
    partidos: Record<string, Record<string, number>>;
  }>;
};

const PALETTE = ["#0c529a", "#009b3a", "#e0a400", "#c0392b", "#7b3fa0", "#2f7dc4", "#16a085", "#e67e22"];

export default function EvolucaoTab({ b }: { b: Bundle }) {
  const [data, setData] = useState<Evol | null>(null);
  const [munCod, setMunCod] = useState("2403103");

  useEffect(() => {
    fetch("/data/eleicao/evolucao-vereador-serido.json").then((r) => r.json()).then(setData);
  }, []);

  const seridoMuns = useMemo(
    () => b.serido.municipios.slice().sort((a, z) => a.nome.localeCompare(z.nome, "pt-BR")),
    [b.serido]
  );

  if (!data) return <div className="card p-16 text-center text-[color:var(--muted)]">Carregando série histórica…</div>;

  const anos = data.meta.anos;
  const mun = data.municipios[munCod];
  if (!mun) return <div className="card p-10">Sem dados.</div>;

  // top partidos pela força no último ano
  const ultimo = anos[anos.length - 1];
  const topPartidos = Object.entries(mun.partidos)
    .map(([p, serie]) => ({ p, serie, ult: serie[String(ultimo)] ?? 0 }))
    .sort((a, z) => z.ult - a.ult)
    .slice(0, 6);

  const maxV = Math.max(1, ...topPartidos.flatMap((tp) => anos.map((a) => tp.serie[String(a)] ?? 0)));

  // insight de crescimento (primeiro→último ano)
  const cresc = topPartidos
    .map((tp) => {
      const ini = tp.serie[String(anos[0])] ?? 0;
      const fim = tp.serie[String(ultimo)] ?? 0;
      return { p: tp.p, delta: fim - ini, fim };
    })
    .sort((a, z) => z.delta - a.delta)[0];

  const nominaisSerie = anos.map((a) => mun.por_ano[String(a)]?.nominais ?? 0);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <SectionTitle kicker="Tendência · 2012 → 2024" title={`Evolução em ${mun.nome}`} desc="Como a força de cada partido para vereador mudou ao longo de quatro eleições. Base para projeção de 2028." />
        <select value={munCod} onChange={(e) => setMunCod(e.target.value)} className="py-2.5 px-3 rounded-xl border border-[color:var(--line)] bg-white text-sm font-semibold text-[color:var(--navy)]">
          {seridoMuns.map((m) => <option key={m.cd_tse} value={String(m.codigo_ibge ?? 0)}>{m.nome}</option>)}
        </select>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Mini label={`Votos nominais ${anos[0]}`} value={fmtInt(nominaisSerie[0])} />
        <Mini label={`Votos nominais ${ultimo}`} value={fmtInt(nominaisSerie[nominaisSerie.length - 1])} />
        <Mini label="Maior crescimento" value={`${partidoLabel(cresc.p)} ${cresc.delta >= 0 ? "+" : ""}${fmtInt(cresc.delta)}`} />
        <Mini label={`Candidatos ${ultimo}`} value={fmtInt(mun.por_ano[String(ultimo)]?.candidatos ?? 0)} />
      </section>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-[color:var(--navy)] mb-1">Força por partido (votos)</h3>
          <p className="text-xs text-[color:var(--muted)] mb-3">Nominais + legenda, por eleição</p>
          <LineChart anos={anos} series={topPartidos.map((tp, i) => ({ label: partidoLabel(tp.p), color: PALETTE[i % PALETTE.length], points: anos.map((a) => tp.serie[String(a)] ?? 0) }))} max={maxV} />
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
            {topPartidos.map((tp, i) => (
              <div key={tp.p} className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="w-3 h-3 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="text-[color:var(--ink)]">{partidoLabel(tp.p)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 self-start">
          <h3 className="text-sm font-bold text-[color:var(--navy)] mb-3">Vereador mais votado por eleição</h3>
          <div className="space-y-3">
            {anos.map((a) => {
              const top = mun.por_ano[String(a)]?.top?.[0];
              return (
                <div key={a} className="flex items-center gap-3">
                  <span className="text-xs font-bold tnum text-white rounded-lg px-2 py-1" style={{ background: "var(--navy)" }}>{a}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[color:var(--ink)] truncate">{top?.nome ?? "—"}</div>
                    <div className="text-xs text-[color:var(--muted)]">{top ? `${partidoLabel(top.partido)} · ${fmtInt(top.votos)} votos` : ""}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function LineChart({ anos, series, max }: { anos: number[]; series: { label: string; color: string; points: number[] }[]; max: number }) {
  const W = 560, H = 240, pad = { l: 44, r: 16, t: 12, b: 26 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (anos.length === 1 ? iw / 2 : (i / (anos.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g} stroke="#eef1f7" />
          <text x={pad.l - 8} y={pad.t + ih * g + 4} textAnchor="end" fontSize="9" fill="#9aa3b5">{fmtInt(Math.round(max * (1 - g)))}</text>
        </g>
      ))}
      {anos.map((a, i) => (
        <text key={a} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill="#5b6577">{a}</text>
      ))}
      {series.map((s) => (
        <g key={s.label}>
          <path d={s.points.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ")} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
          {s.points.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.2" fill="#fff" stroke={s.color} strokeWidth="2" />)}
        </g>
      ))}
    </svg>
  );
}
