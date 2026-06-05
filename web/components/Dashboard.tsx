"use client";

import { useEffect, useMemo, useState } from "react";
import { scaleQuantile } from "d3-scale";
import RNMap from "./RNMap";
import {
  fmtInt, fmtReais, fmtReaisCheio, partidoLabel,
  type Socio, type SeridoVereador, type MunicipioVereador,
} from "../lib/data";

type Indicator = "populacao" | "pib_pc" | "densidade";
const INDICATORS: { key: Indicator; label: string; pick: (s: Socio) => number | null; fmt: (n: number | null) => string }[] = [
  { key: "populacao", label: "População 2022", pick: (s) => s.populacao_2022, fmt: fmtInt },
  { key: "pib_pc", label: "PIB per capita", pick: (s) => s.pib_per_capita_2021, fmt: fmtReaisCheio },
  { key: "densidade", label: "Densidade hab/km²", pick: (s) => s.densidade_hab_km2, fmt: (n) => (n == null ? "—" : n.toLocaleString("pt-BR")) },
];

const RAMP = ["#e8f0fb", "#c2d8ef", "#8fb4dd", "#4f86c2", "#1f5da3", "#0c3f7e"];

export default function Dashboard() {
  const [geo, setGeo] = useState<any>(null);
  const [socio, setSocio] = useState<Socio[]>([]);
  const [serido, setSerido] = useState<SeridoVereador | null>(null);
  const [indicator, setIndicator] = useState<Indicator>("populacao");
  const [selected, setSelected] = useState<number | null>(2403103); // Currais Novos
  const [seridoMun, setSeridoMun] = useState<number>(2403103);

  useEffect(() => {
    (async () => {
      const [g, s, v] = await Promise.all([
        fetch("/data/rn-municipios.geojson").then((r) => r.json()),
        fetch("/data/socioeconomico-rn.json").then((r) => r.json()),
        fetch("/data/eleicao/serido-vereador-2024.json").then((r) => r.json()),
      ]);
      setGeo(g);
      setSocio(s.municipios);
      setSerido(v);
    })();
  }, []);

  const socioByCode = useMemo(() => new Map(socio.map((s) => [s.codigo_ibge, s])), [socio]);
  const vereadorByIbge = useMemo(
    () => new Map((serido?.municipios ?? []).filter((m) => m.codigo_ibge).map((m) => [m.codigo_ibge as number, m])),
    [serido]
  );
  const seridoSet = useMemo(
    () => new Set((serido?.municipios ?? []).map((m) => m.codigo_ibge).filter(Boolean) as number[]),
    [serido]
  );

  const ind = INDICATORS.find((i) => i.key === indicator)!;
  const values = useMemo(() => {
    const m = new Map<number, number | null>();
    for (const s of socio) m.set(s.codigo_ibge, ind.pick(s));
    return m;
  }, [socio, ind]);

  const colorScale = useMemo(() => {
    const vals = [...values.values()].filter((v): v is number => v != null);
    if (!vals.length) return () => "#e8f0fb";
    const scale = scaleQuantile<string>().domain(vals).range(RAMP);
    return (v: number | null | undefined) => (v == null ? "#eef1f6" : scale(v));
  }, [values]);

  // KPIs estaduais
  const totalPop = socio.reduce((a, b) => a + (b.populacao_2022 ?? 0), 0);
  const totalPib = socio.reduce((a, b) => a + (b.pib_2021_mil_reais ?? 0), 0);
  const popSerido = socio.filter((s) => seridoSet.has(s.codigo_ibge)).reduce((a, b) => a + (b.populacao_2022 ?? 0), 0);

  const selSocio = selected ? socioByCode.get(selected) : null;
  const selVereador = selected ? vereadorByIbge.get(selected) : null;
  const explorer = serido?.municipios.find((m) => m.codigo_ibge === seridoMun) ?? null;
  const locaisDoMun = useMemo(
    () => (serido && explorer ? serido.locais_votacao.filter((l) => Number(l.cd) === explorer.cd_tse).slice(0, 8) : []),
    [serido, explorer]
  );

  const loading = !geo || !socio.length || !serido;

  return (
    <div className="flex flex-col min-h-full">
      <Header />

      <main className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 pb-20 flex-1">
        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <Kpi label="Municípios" value="167" sub="Rio Grande do Norte" />
          <Kpi label="População (Censo 2022)" value={fmtInt(totalPop)} sub="habitantes" />
          <Kpi label="PIB municipal (2021)" value={fmtReais(totalPib)} sub="soma dos municípios" />
          <Kpi label="Seridó" value={fmtInt(popSerido)} sub="hab • 23 municípios" accent />
        </section>

        {loading ? (
          <div className="card mt-6 p-16 text-center text-[color:var(--muted)]">Carregando dados oficiais (IBGE + TSE)…</div>
        ) : (
          <div className="grid lg:grid-cols-[1.45fr_1fr] gap-5 mt-6">
            {/* Mapa */}
            <div className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-[color:var(--navy)]">Mapa do RN</h2>
                  <p className="text-sm text-[color:var(--muted)]">Clique num município • contorno dourado = Seridó</p>
                </div>
                <div className="flex gap-1.5 bg-[#eef2f8] p-1 rounded-xl">
                  {INDICATORS.map((i) => (
                    <button
                      key={i.key}
                      onClick={() => setIndicator(i.key)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                        indicator === i.key ? "bg-white text-[color:var(--navy)] shadow-sm" : "text-[color:var(--muted)] hover:text-[color:var(--navy)]"
                      }`}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>
              <RNMap
                geo={geo}
                values={values}
                colorFor={colorScale}
                seridoSet={seridoSet}
                selected={selected}
                onSelect={(c) => { setSelected(c); if (seridoSet.has(c)) setSeridoMun(c); }}
              />
              <Legend ramp={RAMP} />
            </div>

            {/* Painel do município */}
            <div className="card p-5 flex flex-col">
              {selSocio ? (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-[color:var(--navy)] leading-tight">{selSocio.nome}</h2>
                      <p className="text-sm text-[color:var(--muted)]">{selSocio.microrregiao ?? "—"}{seridoSet.has(selSocio.codigo_ibge) ? " • Seridó" : ""}</p>
                    </div>
                    {seridoSet.has(selSocio.codigo_ibge) && (
                      <span className="text-[11px] font-bold text-[color:var(--gold)] bg-[#fff7da] px-2 py-1 rounded-md">SERIDÓ</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <Mini label="População" value={fmtInt(selSocio.populacao_2022)} />
                    <Mini label="PIB per capita" value={fmtReaisCheio(selSocio.pib_per_capita_2021)} />
                    <Mini label="Densidade" value={selSocio.densidade_hab_km2 == null ? "—" : `${selSocio.densidade_hab_km2.toLocaleString("pt-BR")} hab/km²`} />
                    <Mini label="Área" value={selSocio.area_km2 == null ? "—" : `${selSocio.area_km2.toLocaleString("pt-BR")} km²`} />
                  </div>

                  {selVereador ? (
                    <div className="mt-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[color:var(--navy)]">Vereadores mais votados • 2024</h3>
                        <button onClick={() => { setSeridoMun(selVereador.codigo_ibge as number); document.getElementById("serido")?.scrollIntoView({ behavior: "smooth" }); }} className="text-xs font-semibold text-[color:var(--royal)]">ver tudo →</button>
                      </div>
                      <CandBars m={selVereador} limit={6} />
                      <p className="text-xs text-[color:var(--muted)] mt-2">{fmtInt(selVereador.total_votos_nominais)} votos nominais • {selVereador.qtd_candidatos} candidatos</p>
                    </div>
                  ) : (
                    <p className="text-sm text-[color:var(--muted)] mt-5">Dados de vereador 2024 disponíveis para o Seridó. Selecione um município do Seridó para ver o ranking.</p>
                  )}
                </>
              ) : (
                <p className="text-[color:var(--muted)]">Selecione um município no mapa.</p>
              )}
            </div>
          </div>
        )}

        {/* Explorador Seridó */}
        {serido && (
          <section id="serido" className="card mt-6 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-extrabold text-[color:var(--navy)]">Vereadores do Seridó • Eleição 2024</h2>
                <p className="text-sm text-[color:var(--muted)]">Ranking nominal por município (fonte: TSE — votação por seção)</p>
              </div>
              <select
                value={seridoMun}
                onChange={(e) => { const c = Number(e.target.value); setSeridoMun(c); setSelected(c); }}
                className="border border-[color:var(--line)] rounded-lg px-3 py-2 text-sm font-semibold text-[color:var(--navy)] bg-white"
              >
                {serido.municipios.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((m) => (
                  <option key={m.cd_tse} value={m.codigo_ibge ?? 0}>{m.nome}</option>
                ))}
              </select>
            </div>

            {explorer && (
              <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 mt-5">
                <div>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <Mini label="Candidatos" value={fmtInt(explorer.qtd_candidatos)} />
                    <Mini label="Votos nominais" value={fmtInt(explorer.total_votos_nominais)} />
                    <Mini label="Brancos" value={fmtInt(explorer.brancos)} />
                    <Mini label="Nulos" value={fmtInt(explorer.nulos)} />
                  </div>
                  <CandBars m={explorer} limit={15} showParty />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[color:var(--navy)] mb-2">Locais de votação (mais votos)</h3>
                  <ul className="space-y-2">
                    {locaisDoMun.map((l) => (
                      <li key={l.nr} className="text-sm border-b border-[color:var(--line)] pb-2">
                        <div className="font-semibold text-[color:var(--ink)]">{l.nome}</div>
                        <div className="text-xs text-[color:var(--muted)]">{l.endereco} • zona {l.zona} • {fmtInt(l.votos)} votos</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        )}

        <Footer />
      </main>
    </div>
  );
}

function CandBars({ m, limit, showParty }: { m: MunicipioVereador; limit: number; showParty?: boolean }) {
  const top = m.candidatos.slice(0, limit);
  const max = top[0]?.votos ?? 1;
  return (
    <div className="space-y-1.5">
      {top.map((c) => (
        <div key={c.sq} className="flex items-center gap-2">
          <span className="w-5 text-xs font-bold text-[color:var(--muted)] tnum text-right">{c.rank}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs mb-0.5">
              <span className="truncate font-medium text-[color:var(--ink)]">{c.nome}{showParty ? ` · ${partidoLabel(c.partido_num)}` : ""}</span>
              <span className="tnum font-bold text-[color:var(--navy)] ml-2">{c.votos.toLocaleString("pt-BR")}</span>
            </div>
            <div className="h-2 rounded-full bg-[#eef2f8] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.max(3, (c.votos / max) * 100)}%`, background: "linear-gradient(90deg, var(--royal), var(--navy))" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-[color:var(--line)] bg-white/90 backdrop-blur sticky top-0 z-10">
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="wordmark text-2xl">
            <span style={{ color: "var(--navy)" }}>RN</span>
            <span style={{ color: "var(--royal)" }}> Analytics</span>
          </div>
          <span className="hidden sm:inline text-xs text-[color:var(--muted)] border-l border-[color:var(--line)] pl-3">
            Inteligência eleitoral e socioeconômica
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--muted)]">
          <span className="w-3 h-3 rounded-sm" style={{ background: "var(--green)" }} />
          <span className="w-3 h-3 rounded-sm" style={{ background: "var(--gold)" }} />
          <span>RN</span>
        </div>
      </div>
    </header>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold text-[color:var(--muted)]">{label}</div>
      <div className={`text-2xl font-extrabold tnum mt-1 ${accent ? "text-[color:var(--green)]" : "text-[color:var(--navy)]"}`}>{value}</div>
      {sub && <div className="text-xs text-[color:var(--muted)] mt-0.5">{sub}</div>}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#f7f9fc] rounded-lg p-3 border border-[color:var(--line)]">
      <div className="text-[11px] font-semibold text-[color:var(--muted)]">{label}</div>
      <div className="text-base font-bold tnum text-[color:var(--navy)] mt-0.5">{value}</div>
    </div>
  );
}

function Legend({ ramp }: { ramp: string[] }) {
  return (
    <div className="flex items-center gap-2 mt-2 text-xs text-[color:var(--muted)]">
      <span>menos</span>
      <div className="flex">{ramp.map((c) => <span key={c} className="w-7 h-3" style={{ background: c }} />)}</div>
      <span>mais</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="text-center text-xs text-[color:var(--muted)] mt-10 leading-relaxed">
      <p>Fontes: TSE (Dados Abertos — votação por seção) • IBGE (Censo 2022, PIB Municípios, Malhas Territoriais).</p>
      <p className="mt-1">RN Analytics • dados públicos • protótipo para a FEMURN. Nenhum dado individual de eleitor é utilizado.</p>
    </footer>
  );
}
