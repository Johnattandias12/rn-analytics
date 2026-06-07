"use client";

import { useMemo, useState } from "react";
import { scaleQuantile } from "d3-scale";
import type { Bundle } from "../App";
import type { SectionId } from "../App";
import RNMap from "../RNMap";
import { Card, Reveal, useCountUp } from "../ui";
import { fmtInt, fmtReais } from "../../lib/data";

const RAMP = ["#e8f0fb", "#c2d8ef", "#8fb4dd", "#4f86c2", "#1f5da3", "#0c3f7e"];

export default function OverviewTab({ b, goTo }: { b: Bundle; goTo: (t: SectionId) => void }) {
  const totalPop = b.socio.reduce((a, s) => a + (s.populacao_2022 ?? 0), 0);
  const totalPib = b.socio.reduce((a, s) => a + (s.pib_2021_mil_reais ?? 0), 0);
  const popSerido = b.socio.filter((s) => b.seridoSet.has(s.codigo_ibge)).reduce((a, s) => a + (s.populacao_2022 ?? 0), 0);
  const cn = b.serido.municipios.find((m) => m.nome.toUpperCase() === "CURRAIS NOVOS");
  const totalCandSerido = b.serido.municipios.reduce((a, m) => a + m.qtd_candidatos, 0);

  const [selMapa, setSelMapa] = useState<number | null>(2403103);
  const popValues = useMemo(() => {
    const m = new Map<number, number | null>();
    for (const s of b.socio) m.set(s.codigo_ibge, s.populacao_2022);
    return m;
  }, [b.socio]);
  const colorFor = useMemo(() => {
    const vals = [...popValues.values()].filter((v): v is number => v != null);
    const scale = scaleQuantile<string>().domain(vals).range(RAMP);
    return (v: number | null | undefined) => (v == null ? "#eef1f6" : scale(v));
  }, [popValues]);

  return (
    <div>
      <section className="pt-4 pb-10 text-center rise">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--royal)] bg-white/70 border border-[color:var(--line)] rounded-full px-3.5 py-1.5 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--green)] animate-pulse" /> Eleições 2012–2024 · 167 municípios
        </div>
        <h1 className="h-display text-4xl sm:text-6xl max-w-4xl mx-auto">
          <span className="text-gradient">Os números que decidem</span><br />o Rio Grande do Norte
        </h1>
        <p className="text-[17px] sm:text-lg text-[color:var(--muted)] max-w-2xl mx-auto mt-5">
          Inteligência eleitoral e socioeconômica em um só lugar — do panorama estadual ao reduto de cada
          vereador no Seridó e em Currais Novos.
        </p>
        <div className="flex items-center justify-center gap-3 mt-7 flex-wrap">
          <button onClick={() => goTo("analise")} className="btn btn-primary">Mapa de redutos de Currais Novos</button>
          <button onClick={() => goTo("mapa")} className="btn btn-ghost">Explorar o mapa do RN →</button>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <CountKpi label="Municípios" target={167} accent="navy" />
        <CountKpi label="População (Censo 2022)" target={totalPop} accent="royal" sub="habitantes no RN" />
        <CountKpi label="PIB municipal 2021" target={totalPib} accent="green" reais sub="soma dos municípios" />
        <CountKpi label="Eleitorado do Seridó" target={popSerido} accent="gold" sub="23 municípios" />
      </section>

      <section className="mt-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <div>
              <h3 className="text-sm font-bold text-[color:var(--navy)]">Mapa do Rio Grande do Norte</h3>
              <p className="text-xs text-[color:var(--muted)]">População por município (Censo 2022). O contorno dourado marca a Região do Seridó.</p>
            </div>
            <button onClick={() => goTo("mapa")} className="btn btn-ghost text-sm">Abrir mapa completo →</button>
          </div>
          <RNMap
            geo={b.geo}
            values={popValues}
            colorFor={colorFor}
            nameFor={(c) => b.nameByCode.get(c) ?? "—"}
            valueLabel={(v) => `População: ${fmtInt(v as number)}`}
            seridoSet={b.seridoSet}
            selected={selMapa}
            onSelect={(c) => setSelMapa(c)}
          />
        </Card>
      </section>

      <section className="grid md:grid-cols-2 gap-4 mt-4">
        <Reveal delay={0.05}>
          <Card hover className="p-6 h-full overflow-hidden relative">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full" style={{ background: "var(--gold)", opacity: 0.12, filter: "blur(20px)" }} />
            <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--gold)]">Recorte aprofundado</div>
            <h3 className="text-2xl h-display text-[color:var(--navy)] mt-1">Região do Seridó</h3>
            <p className="text-[15px] text-[color:var(--muted)] mt-2">
              {fmtInt(popSerido)} habitantes em 23 municípios. {fmtInt(totalCandSerido)} candidatos a vereador mapeados na eleição de 2024.
            </p>
            <button onClick={() => goTo("mapa")} className="text-sm font-semibold text-[color:var(--royal)] mt-4">Ver no mapa →</button>
          </Card>
        </Reveal>
        <Reveal delay={0.1}>
          <Card hover className="p-6 h-full overflow-hidden relative">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full" style={{ background: "var(--royal)", opacity: 0.12, filter: "blur(20px)" }} />
            <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--royal)]">Núcleo de inteligência</div>
            <h3 className="text-2xl h-display text-[color:var(--navy)] mt-1">Currais Novos</h3>
            <p className="text-[15px] text-[color:var(--muted)] mt-2">
              {cn ? `${fmtInt(cn.total_votos_nominais)} votos nominais e ${cn.qtd_candidatos} candidatos a vereador em 2024` : "—"}, com voto detalhado por seção eleitoral para análise de redutos.
            </p>
            <button onClick={() => goTo("vereadores")} className="text-sm font-semibold text-[color:var(--royal)] mt-4">Filtrar candidatos →</button>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}

function CountKpi({ label, target, accent, sub, reais }: { label: string; target: number; accent: "navy" | "green" | "gold" | "royal"; sub?: string; reais?: boolean }) {
  const v = useCountUp(target, 1200);
  const color = accent === "green" ? "var(--green)" : accent === "gold" ? "#caa106" : accent === "royal" ? "var(--royal)" : "var(--navy)";
  const display = reais ? fmtReais(v) : fmtInt(Math.round(v));
  return (
    <div className="card card-hover p-5 h-full rise">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
      <div className="text-[30px] leading-none font-extrabold tnum mt-2" style={{ color }}>{display}</div>
      {sub && <div className="text-xs text-[color:var(--muted)] mt-1.5">{sub}</div>}
    </div>
  );
}
