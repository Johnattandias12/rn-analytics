"use client";

import { useMemo, useState } from "react";
import { scaleQuantile } from "d3-scale";
import type { Bundle } from "../App";
import RNMap from "../RNMap";
import { Card, Mini, SectionTitle } from "../ui";
import { fmtInt, fmtReaisCheio, partidoLabel, type Socio } from "../../lib/data";

type Ind = "populacao" | "pib_pc" | "densidade";
const INDS: { key: Ind; label: string; pick: (s: Socio) => number | null; fmt: (n: number | null | undefined) => string }[] = [
  { key: "populacao", label: "População", pick: (s) => s.populacao_2022, fmt: (n) => fmtInt(n) },
  { key: "pib_pc", label: "PIB per capita", pick: (s) => s.pib_per_capita_2021, fmt: (n) => fmtReaisCheio(n) },
  { key: "densidade", label: "Densidade", pick: (s) => s.densidade_hab_km2, fmt: (n) => (n == null ? "—" : `${n.toLocaleString("pt-BR")} hab/km²`) },
];
const RAMP = ["#e8f0fb", "#c2d8ef", "#8fb4dd", "#4f86c2", "#1f5da3", "#0c3f7e"];

export default function MapTab({ b }: { b: Bundle }) {
  const [ind, setInd] = useState<Ind>("populacao");
  const [selected, setSelected] = useState<number | null>(2403103);

  const cfg = INDS.find((i) => i.key === ind)!;
  const values = useMemo(() => {
    const m = new Map<number, number | null>();
    for (const s of b.socio) m.set(s.codigo_ibge, cfg.pick(s));
    return m;
  }, [b.socio, cfg]);

  const colorFor = useMemo(() => {
    const vals = [...values.values()].filter((v): v is number => v != null);
    const scale = scaleQuantile<string>().domain(vals).range(RAMP);
    return (v: number | null | undefined) => (v == null ? "#eef1f6" : scale(v));
  }, [values]);

  const sel = selected ? b.socioByCode.get(selected) : null;
  const selVer = selected ? b.serido.municipios.find((m) => m.codigo_ibge === selected) : null;

  return (
    <div>
      <SectionTitle kicker="Mapa interativo" title="Rio Grande do Norte" desc="Clique em qualquer município para ver seus indicadores. O contorno dourado marca a Região do Seridó." />

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <div className="segment">
              {INDS.map((i) => (
                <button key={i.key} data-active={ind === i.key} onClick={() => setInd(i.key)}>{i.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
              <span>menos</span>
              <div className="flex rounded overflow-hidden">{RAMP.map((c) => <span key={c} className="w-6 h-3" style={{ background: c }} />)}</div>
              <span>mais</span>
            </div>
          </div>
          <RNMap
            geo={b.geo}
            values={values}
            colorFor={colorFor}
            nameFor={(c) => b.nameByCode.get(c) ?? "—"}
            valueLabel={(v) => `${cfg.label}: ${cfg.fmt(v)}`}
            seridoSet={b.seridoSet}
            selected={selected}
            onSelect={setSelected}
          />
        </Card>

        <Card className="p-5 self-start">
          {sel ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-2xl h-display text-[color:var(--navy)]">{sel.nome}</h3>
                  <p className="text-sm text-[color:var(--muted)]">{sel.microrregiao ?? "—"}</p>
                </div>
                {b.seridoSet.has(sel.codigo_ibge) && (
                  <span className="text-[10px] font-bold text-[color:var(--gold)] bg-[#fff7da] px-2 py-1 rounded-md">SERIDÓ</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <Mini label="População 2022" value={fmtInt(sel.populacao_2022)} />
                <Mini label="PIB per capita" value={fmtReaisCheio(sel.pib_per_capita_2021)} />
                <Mini label="Densidade" value={sel.densidade_hab_km2 == null ? "—" : `${sel.densidade_hab_km2.toLocaleString("pt-BR")} hab/km²`} />
                <Mini label="Área" value={sel.area_km2 == null ? "—" : `${sel.area_km2.toLocaleString("pt-BR")} km²`} />
              </div>

              {selVer && (
                <div className="mt-5">
                  <h4 className="text-sm font-bold text-[color:var(--navy)] mb-2">Vereadores mais votados · 2024</h4>
                  <div className="space-y-1.5">
                    {selVer.candidatos.slice(0, 6).map((c) => {
                      const max = selVer.candidatos[0].votos || 1;
                      return (
                        <div key={c.sq} className="flex items-center gap-2">
                          <span className="w-4 text-xs font-bold text-[color:var(--muted)] tnum text-right">{c.rank}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="truncate font-medium">{c.nome} · {partidoLabel(c.partido_num)}</span>
                              <span className="tnum font-bold text-[color:var(--navy)] ml-2">{fmtInt(c.votos)}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#eef2f8] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.max(3, (c.votos / max) * 100)}%`, background: "linear-gradient(90deg, var(--royal-2), var(--navy))" }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-[color:var(--muted)]">Selecione um município no mapa.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
