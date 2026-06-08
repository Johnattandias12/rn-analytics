"use client";

import { useMemo, useState } from "react";
import type { Bundle } from "../App";
import { Card, Mini, SectionTitle } from "../ui";
import { fmtInt, fmtReais, fmtReaisCheio, partidoLabel, type Candidato } from "../../lib/data";
import CandidateModal from "../CandidateModal";

type CandCtxItem = { cand: Candidato; munNome: string; codigoIbge: number | null; totalNominais: number };

export default function DashboardTab({ b }: { b: Bundle }) {
  const [sel, setSel] = useState<CandCtxItem | null>(null);

  const totalPop = b.socio.reduce((a, s) => a + (s.populacao_2022 ?? 0), 0);
  const totalPib = b.socio.reduce((a, s) => a + (s.pib_2021_mil_reais ?? 0), 0);
  const popSerido = b.socio.filter((s) => b.seridoSet.has(s.codigo_ibge)).reduce((a, s) => a + (s.populacao_2022 ?? 0), 0);
  const totalCandSerido = b.serido.municipios.reduce((a, m) => a + m.qtd_candidatos, 0);
  const totalVotosSerido = b.serido.municipios.reduce((a, m) => a + m.total_votos_nominais, 0);

  const popTop = useMemo(
    () => b.socio.filter((s) => s.populacao_2022 != null).sort((a, z) => (z.populacao_2022 ?? 0) - (a.populacao_2022 ?? 0)).slice(0, 10),
    [b.socio]
  );
  const pibTop = useMemo(
    () => b.socio.filter((s) => s.pib_per_capita_2021 != null).sort((a, z) => (z.pib_per_capita_2021 ?? 0) - (a.pib_per_capita_2021 ?? 0)).slice(0, 10),
    [b.socio]
  );

  const partidoSerido = useMemo(() => {
    const m = new Map<string, number>();
    for (const mun of b.serido.municipios) for (const c of mun.candidatos) m.set(c.partido_num, (m.get(c.partido_num) ?? 0) + c.votos);
    return [...m.entries()].map(([num, votos]) => ({ num, votos })).sort((a, z) => z.votos - a.votos).slice(0, 8);
  }, [b.serido]);

  const topVereadores = useMemo(() => {
    const arr: CandCtxItem[] = [];
    for (const mun of b.serido.municipios)
      for (const c of mun.candidatos) arr.push({ cand: c, munNome: mun.nome, codigoIbge: mun.codigo_ibge, totalNominais: mun.total_votos_nominais });
    return arr.sort((a, z) => z.cand.votos - a.cand.votos).slice(0, 12);
  }, [b.serido]);

  return (
    <div>
      <SectionTitle
        kicker="Visão analítica"
        title="Dashboard"
        desc="Os principais números do estado e do Seridó em um só painel. Clique em um vereador para abrir o relatório."
      />

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <Mini label="Municípios" value="167" />
        <Mini label="População RN" value={fmtInt(totalPop)} />
        <Mini label="PIB municipal" value={fmtReais(totalPib)} />
        <Mini label="Eleitorado Seridó" value={fmtInt(popSerido)} />
        <Mini label="Candidatos Seridó 2024" value={fmtInt(totalCandSerido)} />
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-[color:var(--navy)] mb-1">Maiores municípios por população</h3>
          <p className="text-xs text-[color:var(--muted)] mb-3">Censo 2022 (top 10)</p>
          <BarList items={popTop.map((s) => ({ label: s.nome, value: s.populacao_2022 ?? 0, fmt: fmtInt(s.populacao_2022), highlight: b.seridoSet.has(s.codigo_ibge) }))} />
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-[color:var(--navy)] mb-1">Maiores PIB per capita</h3>
          <p className="text-xs text-[color:var(--muted)] mb-3">2021 (top 10)</p>
          <BarList items={pibTop.map((s) => ({ label: s.nome, value: s.pib_per_capita_2021 ?? 0, fmt: fmtReaisCheio(s.pib_per_capita_2021), highlight: b.seridoSet.has(s.codigo_ibge) }))} />
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-[color:var(--navy)] mb-1">Força dos partidos no Seridó</h3>
          <p className="text-xs text-[color:var(--muted)] mb-3">Votos para vereador, 2024 ({fmtInt(totalVotosSerido)} no total)</p>
          <BarList items={partidoSerido.map((p) => ({ label: partidoLabel(p.num), value: p.votos, fmt: fmtInt(p.votos) }))} green />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-[color:var(--navy)]">Vereadores mais votados do Seridó</h3>
          </div>
          <p className="text-xs text-[color:var(--muted)] mb-3">2024 (clique para o relatório)</p>
          <div className="space-y-1">
            {topVereadores.map((it, i) => {
              const max = topVereadores[0].cand.votos || 1;
              return (
                <button
                  key={it.cand.sq}
                  onClick={() => setSel(it)}
                  title="Ver resumo, seções e relatório PDF"
                  className="group w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 -mx-1 transition-all duration-200 hover:bg-[#f1f6fd] hover:translate-x-0.5"
                >
                  <span className="w-4 text-xs font-bold tnum text-[color:var(--muted)] text-right group-hover:text-[color:var(--royal)]">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="truncate font-medium flex items-center gap-1">
                        {it.cand.nome}
                        <span className="text-[color:var(--muted)]">· {partidoLabel(it.cand.partido_num)} · {it.munNome}</span>
                        <svg className="opacity-0 group-hover:opacity-100 transition text-[color:var(--royal)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M9 6l6 6-6 6" /></svg>
                      </span>
                      <span className="tnum font-bold text-[color:var(--navy)] ml-2">{fmtInt(it.cand.votos)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#eef2f8] overflow-hidden">
                      <div className="h-full rounded-full transition-all group-hover:opacity-80" style={{ width: `${Math.max(3, (it.cand.votos / max) * 100)}%`, background: "linear-gradient(90deg, var(--royal-2), var(--navy))" }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {sel && (
        <CandidateModal cand={sel.cand} ctx={{ munNome: sel.munNome, ano: 2024, codigoIbge: sel.codigoIbge, totalNominais: sel.totalNominais }} onClose={() => setSel(null)} />
      )}
    </div>
  );
}

function BarList({ items, green }: { items: { label: string; value: number; fmt: string; highlight?: boolean }[]; green?: boolean }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-[color:var(--ink)] truncate flex items-center gap-1.5">
              {it.label}
              {it.highlight && <span className="text-[8px] font-bold text-[color:var(--gold)] bg-[#fff7da] px-1 py-0.5 rounded">SERIDÓ</span>}
            </span>
            <span className="tnum font-bold text-[color:var(--navy)] ml-2 shrink-0">{it.fmt}</span>
          </div>
          <div className="h-2 rounded-full bg-[#eef2f8] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.max(3, (it.value / max) * 100)}%`, background: green ? "linear-gradient(90deg, var(--green), var(--royal))" : "linear-gradient(90deg, var(--royal-2), var(--navy))" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
