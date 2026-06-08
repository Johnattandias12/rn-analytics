"use client";

import { useMemo, useState } from "react";
import { scaleQuantile } from "d3-scale";
import type { Bundle } from "../App";
import RNMap from "../RNMap";
import { Card, Mini, SectionTitle } from "../ui";
import { fmtInt, fmtReais, fmtReaisCheio, partidoLabel, type Candidato, type Socio } from "../../lib/data";
import CandidateModal from "../CandidateModal";
import { exportPDF } from "../../lib/export";

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
  const [selCand, setSelCand] = useState<Candidato | null>(null);

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

  const doMunReport = () => {
    if (!sel) return;
    const ehSerido = b.seridoSet.has(sel.codigo_ibge);
    const tot = selVer?.total_votos_nominais ?? 0;
    exportPDF({
      filename: `relatorio_${sel.nome.replace(/\s+/g, "_").toLowerCase()}.pdf`,
      title: `${sel.nome} · Panorama do município`,
      subtitle: `${sel.microrregiao ?? "Rio Grande do Norte"}${ehSerido ? " · Região do Seridó" : ""}`,
      intro: "Relatório consolidado cruzando indicadores socioeconômicos (IBGE, Censo 2022 e PIB 2021) com os resultados eleitorais mais recentes (TSE).",
      kpis: [
        { label: "População 2022", value: fmtInt(sel.populacao_2022) },
        { label: "PIB per capita", value: fmtReaisCheio(sel.pib_per_capita_2021) },
        { label: "Densidade", value: sel.densidade_hab_km2 == null ? "—" : `${sel.densidade_hab_km2.toLocaleString("pt-BR")} hab/km²` },
        { label: "Área", value: sel.area_km2 == null ? "—" : `${sel.area_km2.toLocaleString("pt-BR")} km²` },
      ],
      table: {
        columns: ["Indicador socioeconômico", "Valor", "Fonte"],
        rows: [
          ["População (Censo)", fmtInt(sel.populacao_2022), "IBGE 2022"],
          ["Área territorial", sel.area_km2 == null ? "—" : `${sel.area_km2.toLocaleString("pt-BR")} km²`, "IBGE"],
          ["Densidade demográfica", sel.densidade_hab_km2 == null ? "—" : `${sel.densidade_hab_km2.toLocaleString("pt-BR")} hab/km²`, "IBGE"],
          ["PIB municipal", fmtReais(sel.pib_2021_mil_reais), "IBGE 2021"],
          ["PIB per capita", fmtReaisCheio(sel.pib_per_capita_2021), "IBGE 2021"],
          ["Microrregião", sel.microrregiao ?? "—", "IBGE"],
        ],
      },
      sections: selVer
        ? [
            {
              heading: "Vereadores mais votados · 2024",
              note: `${fmtInt(selVer.qtd_candidatos)} candidatos · ${fmtInt(tot)} votos nominais · ${fmtInt(selVer.brancos)} brancos · ${fmtInt(selVer.nulos)} nulos.`,
              table: {
                columns: ["#", "Candidato", "Partido", "Votos", "% válidos"],
                rows: selVer.candidatos.slice(0, 15).map((c, i) => [
                  i + 1,
                  c.nome,
                  partidoLabel(c.partido_num),
                  fmtInt(c.votos),
                  tot ? ((c.votos / tot) * 100).toFixed(2).replace(".", ",") + "%" : "—",
                ]),
              },
            },
          ]
        : [],
    });
  };

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

              <button onClick={doMunReport} className="btn btn-primary text-sm w-full justify-center mt-3">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></svg>
                Relatório completo do município (PDF)
              </button>

              {selVer && (
                <div className="mt-5">
                  <h4 className="text-sm font-bold text-[color:var(--navy)] mb-2">Vereadores mais votados · 2024 <span className="font-medium text-[color:var(--muted)]">· clique para o relatório</span></h4>
                  <div className="space-y-1">
                    {selVer.candidatos.slice(0, 6).map((c) => {
                      const max = selVer.candidatos[0].votos || 1;
                      return (
                        <button
                          key={c.sq}
                          onClick={() => setSelCand(c)}
                          title="Ver resumo, seções e relatório PDF"
                          className="group w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 -mx-1 transition-all duration-200 hover:bg-[#f1f6fd] hover:translate-x-0.5"
                        >
                          <span className="w-4 text-xs font-bold text-[color:var(--muted)] tnum text-right group-hover:text-[color:var(--royal)]">{c.rank}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="truncate font-medium flex items-center gap-1">
                                {c.nome} · {partidoLabel(c.partido_num)}
                                <svg className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[color:var(--royal)] shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M9 6l6 6-6 6" /></svg>
                              </span>
                              <span className="tnum font-bold text-[color:var(--navy)] ml-2">{fmtInt(c.votos)}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#eef2f8] overflow-hidden">
                              <div className="h-full rounded-full transition-all group-hover:opacity-80" style={{ width: `${Math.max(3, (c.votos / max) * 100)}%`, background: "linear-gradient(90deg, var(--royal-2), var(--navy))" }} />
                            </div>
                          </div>
                        </button>
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

      {selCand && (
        <CandidateModal
          cand={selCand}
          ctx={{ munNome: sel?.nome ?? "—", ano: 2024, codigoIbge: selected, totalNominais: selVer?.total_votos_nominais ?? 0 }}
          onClose={() => setSelCand(null)}
        />
      )}
    </div>
  );
}
