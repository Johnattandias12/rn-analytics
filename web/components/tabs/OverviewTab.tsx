"use client";

import { motion } from "framer-motion";
import type { Bundle } from "../App";
import { Card, Reveal, useCountUp } from "../ui";
import { fmtInt, fmtReais } from "../../lib/data";

export default function OverviewTab({ b, goTo }: { b: Bundle; goTo: (t: any) => void }) {
  const totalPop = b.socio.reduce((a, s) => a + (s.populacao_2022 ?? 0), 0);
  const totalPib = b.socio.reduce((a, s) => a + (s.pib_2021_mil_reais ?? 0), 0);
  const popSerido = b.socio.filter((s) => b.seridoSet.has(s.codigo_ibge)).reduce((a, s) => a + (s.populacao_2022 ?? 0), 0);
  const cn = b.serido.municipios.find((m) => m.nome.toUpperCase() === "CURRAIS NOVOS");
  const totalCandSerido = b.serido.municipios.reduce((a, m) => a + m.qtd_candidatos, 0);

  return (
    <div>
      {/* HERO */}
      <section className="pt-6 pb-10 text-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}>
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
            <button onClick={() => goTo("mapa")} className="btn btn-primary">Explorar o mapa</button>
            <button onClick={() => goTo("vereadores")} className="btn btn-ghost">Vereadores de Currais Novos →</button>
          </div>
        </motion.div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <CountKpi label="Municípios" target={167} delay={0} accent="navy" />
        <CountKpi label="População (Censo 2022)" target={totalPop} delay={0.05} accent="royal" sub="habitantes no RN" />
        <CountKpi label="PIB municipal 2021" target={totalPib} delay={0.1} accent="green" reais sub="soma dos municípios" />
        <CountKpi label="Eleitorado do Seridó" target={popSerido} delay={0.15} accent="gold" sub="23 municípios" />
      </section>

      {/* DESTAQUES */}
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

function CountKpi({ label, target, delay, accent, sub, reais }: { label: string; target: number; delay: number; accent: "navy" | "green" | "gold" | "royal"; sub?: string; reais?: boolean }) {
  const v = useCountUp(target, 1200);
  const color = accent === "green" ? "var(--green)" : accent === "gold" ? "#caa106" : accent === "royal" ? "var(--royal)" : "var(--navy)";
  const display = reais ? fmtReais(v) : fmtInt(Math.round(v));
  return (
    <Reveal delay={delay}>
      <Card hover className="p-5 h-full">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
        <div className="text-[30px] leading-none font-extrabold tnum mt-2" style={{ color }}>{display}</div>
        {sub && <div className="text-xs text-[color:var(--muted)] mt-1.5">{sub}</div>}
      </Card>
    </Reveal>
  );
}
