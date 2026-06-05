"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Bundle } from "../App";
import { Card, Mini, SectionTitle } from "../ui";
import { fmtInt, partidoLabel, type MunicipioVereador } from "../../lib/data";
import { exportCSV, exportXLSX, exportPDF } from "../../lib/export";

type SortKey = "votos_desc" | "votos_asc" | "nome" | "numero";

export default function VereadoresTab({ b }: { b: Bundle }) {
  const seridoMuns = useMemo(
    () => b.serido.municipios.slice().sort((a, z) => a.nome.localeCompare(z.nome, "pt-BR")),
    [b.serido]
  );
  const [munCod, setMunCod] = useState<number>(2403103); // Currais Novos
  const mun: MunicipioVereador =
    b.serido.municipios.find((m) => m.codigo_ibge === munCod) ?? b.serido.municipios[0];

  const [busca, setBusca] = useState("");
  const [partidos, setPartidos] = useState<Set<string>>(new Set());
  const [minVotos, setMinVotos] = useState(0);
  const [sort, setSort] = useState<SortKey>("votos_desc");

  const maxVotos = mun.candidatos[0]?.votos ?? 0;
  const totalNominais = mun.total_votos_nominais;

  // partidos presentes (por total de votos)
  const partidosPresentes = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of mun.candidatos) m.set(c.partido_num, (m.get(c.partido_num) ?? 0) + c.votos);
    return [...m.entries()].map(([num, votos]) => ({ num, votos })).sort((a, z) => z.votos - a.votos);
  }, [mun]);

  const filtrados = useMemo(() => {
    let r = mun.candidatos.filter((c) => {
      if (busca && !c.nome.toLowerCase().includes(busca.toLowerCase()) && !c.numero.includes(busca)) return false;
      if (partidos.size && !partidos.has(c.partido_num)) return false;
      if (c.votos < minVotos) return false;
      return true;
    });
    r = r.slice();
    if (sort === "votos_desc") r.sort((a, z) => z.votos - a.votos);
    else if (sort === "votos_asc") r.sort((a, z) => a.votos - z.votos);
    else if (sort === "nome") r.sort((a, z) => a.nome.localeCompare(z.nome, "pt-BR"));
    else r.sort((a, z) => a.numero.localeCompare(z.numero));
    return r;
  }, [mun, busca, partidos, minVotos, sort]);

  const somaFiltrada = filtrados.reduce((a, c) => a + c.votos, 0);
  const partidoLider = partidosPresentes[0];

  const togglePartido = (num: string) =>
    setPartidos((s) => {
      const n = new Set(s);
      n.has(num) ? n.delete(num) : n.add(num);
      return n;
    });
  const limpar = () => { setBusca(""); setPartidos(new Set()); setMinVotos(0); setSort("votos_desc"); };

  // ---- exportações ----
  const rowsExport = filtrados.map((c, i) => ({
    Posição: i + 1,
    "Rank no município": c.rank,
    Candidato: c.nome,
    Partido: partidoLabel(c.partido_num),
    Número: c.numero,
    Votos: c.votos,
    "% válidos": totalNominais ? ((c.votos / totalNominais) * 100).toFixed(2).replace(".", ",") + "%" : "—",
  }));
  const resumoPartidos = partidosPresentes.map((p) => ({
    Partido: partidoLabel(p.num),
    Número: p.num,
    "Votos (legenda + nominais)": p.votos,
    "% do total": totalNominais ? ((p.votos / totalNominais) * 100).toFixed(2).replace(".", ",") + "%" : "—",
  }));
  const baseName = `vereadores_${mun.nome.replace(/\s+/g, "_").toLowerCase()}_2024`;

  const doCSV = () => exportCSV(`${baseName}.csv`, rowsExport);
  const doXLSX = () => exportXLSX(`${baseName}.xlsx`, [
    { name: "Candidatos", rows: rowsExport },
    { name: "Resumo por partido", rows: resumoPartidos },
  ]);
  const doPDF = () =>
    exportPDF({
      filename: `${baseName}.pdf`,
      title: `Vereadores de ${mun.nome} — Eleição 2024`,
      subtitle: `${filtrados.length} de ${mun.candidatos.length} candidatos${partidos.size ? ` · partidos: ${[...partidos].map(partidoLabel).join(", ")}` : ""}${busca ? ` · busca: "${busca}"` : ""}`,
      kpis: [
        { label: "Candidatos", value: fmtInt(filtrados.length) },
        { label: "Votos (filtro)", value: fmtInt(somaFiltrada) },
        { label: "Partido líder", value: partidoLabel(partidoLider?.num ?? "") },
        { label: "Mais votado", value: filtrados[0]?.nome.split(" ").slice(0, 2).join(" ") ?? "—" },
      ],
      table: {
        columns: ["#", "Candidato", "Partido", "Nº", "Votos", "% válidos"],
        rows: rowsExport.map((r) => [r["Posição"], r.Candidato, r.Partido, r["Número"], fmtInt(r.Votos as number), r["% válidos"]]),
      },
    });

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <SectionTitle
          kicker="Inteligência eleitoral · 2024"
          title={`Vereadores de ${mun.nome}`}
          desc="Filtre por nome, partido e faixa de votos para encontrar padrões e redutos. Exporte o recorte em PDF ou planilha."
        />
        <div className="flex gap-2">
          <button onClick={doPDF} className="btn btn-ghost text-sm"><IconPdf /> PDF</button>
          <button onClick={doXLSX} className="btn btn-ghost text-sm"><IconSheet /> Planilha</button>
          <button onClick={doCSV} className="btn btn-primary text-sm"><IconDown /> CSV</button>
        </div>
      </div>

      {/* INSIGHTS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Mini label="Candidatos (filtro)" value={`${fmtInt(filtrados.length)} / ${mun.candidatos.length}`} />
        <Mini label="Votos somados (filtro)" value={fmtInt(somaFiltrada)} />
        <Mini label="Partido líder" value={`${partidoLabel(partidoLider?.num ?? "")} · ${fmtInt(partidoLider?.votos ?? 0)}`} />
        <Mini label="Brancos / Nulos" value={`${fmtInt(mun.brancos)} / ${fmtInt(mun.nulos)}`} />
      </section>

      {/* FILTROS */}
      <Card className="p-4 sm:p-5 mb-4">
        <div className="grid lg:grid-cols-[1fr_auto] gap-4 items-start">
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-[220px]">
                <IconSearch />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar candidato por nome ou número…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[color:var(--line)] bg-white text-sm"
                />
              </div>
              <select value={munCod} onChange={(e) => { setMunCod(Number(e.target.value)); limpar(); }} className="py-2.5 px-3 rounded-xl border border-[color:var(--line)] bg-white text-sm font-semibold text-[color:var(--navy)]">
                {seridoMuns.map((m) => <option key={m.cd_tse} value={m.codigo_ibge ?? 0}>{m.nome}</option>)}
              </select>
            </div>

            {/* chips de partido */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--muted)] mb-1.5">Partidos {partidos.size > 0 && `(${partidos.size})`}</div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {partidosPresentes.map((p) => {
                  const on = partidos.has(p.num);
                  return (
                    <button
                      key={p.num}
                      onClick={() => togglePartido(p.num)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-full border transition"
                      style={{
                        background: on ? "var(--navy)" : "#fff",
                        color: on ? "#fff" : "var(--ink-2)",
                        borderColor: on ? "var(--navy)" : "var(--line)",
                      }}
                    >
                      {partidoLabel(p.num)} <span className="opacity-60">{fmtInt(p.votos)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:w-64 space-y-3">
            <div>
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide text-[color:var(--muted)] mb-1.5">
                <span>Votos mínimos</span><span className="tnum text-[color:var(--navy)]">{fmtInt(minVotos)}</span>
              </div>
              <input type="range" min={0} max={maxVotos} value={minVotos} onChange={(e) => setMinVotos(Number(e.target.value))} className="w-full accent-[color:var(--royal)]" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--muted)] mb-1.5">Ordenar por</div>
              <div className="segment w-full flex-wrap">
                {([["votos_desc", "Mais votados"], ["votos_asc", "Menos"], ["nome", "Nome"], ["numero", "Nº"]] as [SortKey, string][]).map(([k, l]) => (
                  <button key={k} data-active={sort === k} onClick={() => setSort(k)}>{l}</button>
                ))}
              </div>
            </div>
            <button onClick={limpar} className="text-xs font-semibold text-[color:var(--royal)]">Limpar filtros</button>
          </div>
        </div>
      </Card>

      {/* TABELA + PARTIDOS */}
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[color:var(--muted)] border-b border-[color:var(--line)]">
                  <th className="py-3 px-4 font-bold">#</th>
                  <th className="py-3 px-2 font-bold">Candidato</th>
                  <th className="py-3 px-2 font-bold">Partido</th>
                  <th className="py-3 px-2 font-bold text-right">Votos</th>
                  <th className="py-3 px-4 font-bold text-right w-[28%]">% válidos</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c, i) => {
                  const pct = totalNominais ? (c.votos / totalNominais) * 100 : 0;
                  return (
                    <motion.tr
                      key={c.sq}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: Math.min(i * 0.012, 0.3) }}
                      className="border-b border-[color:var(--line-2)] hover:bg-[#f8fafd]"
                    >
                      <td className="py-2.5 px-4 tnum font-bold text-[color:var(--muted)]">{i + 1}</td>
                      <td className="py-2.5 px-2 font-semibold text-[color:var(--ink)]">{c.nome}</td>
                      <td className="py-2.5 px-2"><span className="text-xs font-semibold text-[color:var(--royal)] bg-[#eef4fb] px-2 py-0.5 rounded">{partidoLabel(c.partido_num)}</span></td>
                      <td className="py-2.5 px-2 text-right tnum font-bold text-[color:var(--navy)]">{fmtInt(c.votos)}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="h-1.5 w-full max-w-[120px] rounded-full bg-[#eef2f8] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct * 4)}%`, background: "linear-gradient(90deg, var(--royal-2), var(--navy))" }} />
                          </div>
                          <span className="tnum text-xs text-[color:var(--muted)] w-12 text-right">{pct.toFixed(2)}%</span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                {!filtrados.length && (
                  <tr><td colSpan={5} className="py-10 text-center text-[color:var(--muted)]">Nenhum candidato com esses filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5 self-start">
          <h4 className="text-sm font-bold text-[color:var(--navy)] mb-3">Força por partido</h4>
          <div className="space-y-2">
            {partidosPresentes.slice(0, 12).map((p) => {
              const max = partidosPresentes[0].votos || 1;
              return (
                <button key={p.num} onClick={() => togglePartido(p.num)} className="w-full text-left group">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-[color:var(--ink)]">{partidoLabel(p.num)}</span>
                    <span className="tnum font-bold text-[color:var(--navy)]">{fmtInt(p.votos)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#eef2f8] overflow-hidden">
                    <div className="h-full rounded-full transition-all group-hover:opacity-80" style={{ width: `${Math.max(4, (p.votos / max) * 100)}%`, background: partidos.has(p.num) ? "var(--gold)" : "linear-gradient(90deg, var(--green), var(--royal))" }} />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---- ícones inline ----
const IconSearch = () => (<svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>);
const IconDown = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>);
const IconPdf = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></svg>);
const IconSheet = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 10h16M10 4v16" /></svg>);
