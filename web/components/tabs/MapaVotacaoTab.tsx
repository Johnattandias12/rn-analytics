"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, Geometry } from "geojson";
import type { Bundle } from "../App";
import CNVotingMap, { type Local } from "../CNVotingMap";
import { Card, Mini, SectionTitle } from "../ui";
import { fmtInt, partidoLabel, type Candidato } from "../../lib/data";
import { exportCSV } from "../../lib/export";
import CandidateModal from "../CandidateModal";

type Cand = { sq: string; numero: string; nome: string; partido_num: string; votos: number; rank: number; por_local: Record<string, number> };
type Cargo = { total_nominais: number; brancos: number; nulos: number; legenda: number; candidatos: Cand[] };
type CNData = { meta: { ano: number; cd_tse: number }; locais: Local[]; vereador: Cargo; prefeito: Cargo };

const ANOS = [2016, 2020, 2024];

export default function MapaVotacaoTab({ b }: { b: Bundle }) {
  const [ano, setAno] = useState(2024);
  const [cargo, setCargo] = useState<"vereador" | "prefeito">("vereador");
  const [sq, setSq] = useState<string | null>(null);
  const [localSel, setLocalSel] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const cache = useRef<Map<number, CNData>>(new Map());
  const [data, setData] = useState<CNData | null>(null);
  const [selReport, setSelReport] = useState<Candidato | null>(null);

  useEffect(() => {
    let alive = true;
    if (cache.current.has(ano)) { setData(cache.current.get(ano)!); return; }
    fetch(`/data/eleicao/cn/currais-novos-${ano}.json`).then((r) => r.json()).then((d: CNData) => { cache.current.set(ano, d); if (alive) setData(d); });
    return () => { alive = false; };
  }, [ano]);

  const boundary = useMemo(
    () => b.geo.features.find((f) => f.properties.codarea === "2403103") as Feature<Geometry, { codarea: string }> | undefined,
    [b.geo]
  );

  if (!data || !boundary) return <div className="card p-16 text-center text-[color:var(--muted)]">Carregando mapa de Currais Novos…</div>;

  const C = data[cargo];
  const selCand = sq ? C.candidatos.find((c) => c.sq === sq) : null;
  const valueFor = (nr: string) =>
    selCand ? selCand.por_local[nr] ?? 0 : cargo === "vereador" ? data.locais.find((l) => l.nr === nr)?.vereador_total ?? 0 : data.locais.find((l) => l.nr === nr)?.prefeito_total ?? 0;
  const max = Math.max(1, ...data.locais.map((l) => valueFor(l.nr)));
  const metricLabel = selCand ? selCand.nome.split(" ").slice(0, 2).join(" ") : "Comparecimento";

  const candFiltrados = C.candidatos.filter((c) => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || c.numero.includes(busca));
  const localObj = localSel ? data.locais.find((l) => l.nr === localSel) : null;
  // ranking de candidatos no local selecionado
  const rankNoLocal = localObj
    ? C.candidatos.map((c) => ({ c, v: c.por_local[localObj.nr] ?? 0 })).filter((x) => x.v > 0).sort((a, z) => z.v - a.v).slice(0, 6)
    : [];
  const compareceuLocal = localObj ? (cargo === "vereador" ? localObj.vereador_total : localObj.prefeito_total) : 0;
  const abstLocal = localObj && localObj.eleitores ? localObj.eleitores - compareceuLocal : null;

  const exportRedutos = () => {
    const rows = data.locais
      .filter((l) => l.lat != null)
      .map((l) => ({
        Local: l.nome, Bairro: l.bairro, Eleitores: l.eleitores,
        [`Votos ${metricLabel}`]: valueFor(l.nr),
        Latitude: l.lat, Longitude: l.long,
      }))
      .sort((a, z) => (z[`Votos ${metricLabel}`] as number) - (a[`Votos ${metricLabel}`] as number));
    exportCSV(`redutos_${cargo}_${selCand ? selCand.nome.replace(/\s+/g, "_").toLowerCase() : "comparecimento"}_${ano}.csv`, rows);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <SectionTitle kicker={`Mapa de votação · ${ano}`} title="Redutos de Currais Novos" desc="Cada círculo é um local de votação (geolocalizado). O tamanho e a cor mostram a votação — escolha um candidato para ver onde está a base dele." />
        <div className="flex flex-col items-end gap-2">
          <div className="segment">{ANOS.map((y) => <button key={y} data-active={ano === y} onClick={() => { setAno(y); setSq(null); }}>{y}</button>)}</div>
          <div className="segment">
            <button data-active={cargo === "vereador"} onClick={() => { setCargo("vereador"); setSq(null); }}>Vereador</button>
            <button data-active={cargo === "prefeito"} onClick={() => { setCargo("prefeito"); setSq(null); }}>Prefeito</button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <div className="text-sm font-bold text-[color:var(--navy)]">
              {selCand ? <>Reduto de <span className="text-[color:var(--royal)]">{selCand.nome}</span> ({partidoLabel(selCand.partido_num)})</> : "Comparecimento por local"}
            </div>
            <div className="flex gap-2">
              {selCand && <button onClick={() => setSq(null)} className="text-xs font-semibold text-[color:var(--royal)]">← comparecimento</button>}
              <button onClick={exportRedutos} className="btn btn-ghost text-xs py-1.5 px-3">Exportar CSV</button>
            </div>
          </div>
          <CNVotingMap boundary={boundary} locais={data.locais} valueFor={valueFor} max={max} selected={localSel} onSelect={setLocalSel} metricLabel={metricLabel} />
          <div className="flex items-center gap-2 text-xs text-[color:var(--muted)] mt-1">
            <span>menos votos</span>
            <div className="flex rounded overflow-hidden">
              {["#b4ceeb", "#7fa9d6", "#4f86c2", "#1f5da3", "#0c3f7e", "#caa106"].map((c, i) => <span key={i} className="w-7 h-3" style={{ background: c }} />)}
            </div>
            <span>mais votos (reduto)</span>
          </div>
        </Card>

        <div className="space-y-4">
          {localObj && (
            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[color:var(--navy)] leading-tight">{localObj.nome}</h3>
                  <p className="text-xs text-[color:var(--muted)]">{localObj.bairro} · {localObj.n_secoes} seções</p>
                </div>
                <button onClick={() => setLocalSel(null)} className="text-[color:var(--muted)] text-lg leading-none">×</button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <Mini label="Eleitores" value={fmtInt(localObj.eleitores)} />
                <Mini label="Compareceu" value={fmtInt(compareceuLocal)} />
                <Mini label="Abstenção" value={abstLocal == null ? "—" : fmtInt(abstLocal)} />
              </div>
              <h4 className="text-xs font-bold text-[color:var(--navy)] mt-4 mb-2">Mais votados neste local</h4>
              <div className="space-y-1.5">
                {rankNoLocal.map(({ c, v }) => (
                  <div key={c.sq} onClick={() => setSq(c.sq)} className="group w-full flex items-center justify-between text-xs hover:bg-[#f1f6fd] rounded px-1 py-0.5 cursor-pointer transition-colors">
                    <span className="truncate font-medium">{c.nome} · {partidoLabel(c.partido_num)}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="tnum font-bold text-[color:var(--navy)] ml-2">{fmtInt(v)}</span>
                      <button onClick={(e) => { e.stopPropagation(); setSelReport(c); }} title="Relatório PDF" className="p-0.5 rounded text-[color:var(--muted)] opacity-0 group-hover:opacity-100 hover:text-[color:var(--royal)] transition">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></svg>
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-[color:var(--navy)]">Candidatos · clique p/ ver reduto</h4>
              <span className="text-xs text-[color:var(--muted)]">{C.candidatos.length}</span>
            </div>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar candidato…" className="w-full mb-2 px-3 py-2 rounded-lg border border-[color:var(--line)] text-sm" />
            <div className="max-h-[360px] overflow-y-auto space-y-1 pr-1">
              {candFiltrados.slice(0, 60).map((c) => {
                const on = sq === c.sq;
                return (
                  <div key={c.sq} onClick={() => setSq(on ? null : c.sq)} title="Clique para ver o reduto no mapa" className="group w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left cursor-pointer transition-all duration-200 hover:bg-[#f1f6fd]" style={{ background: on ? "rgba(12,82,154,0.1)" : undefined }}>
                    <span className="w-5 text-xs font-bold tnum text-[color:var(--muted)] text-right">{c.rank}</span>
                    <span className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: on ? "var(--royal)" : "var(--ink)" }}>{c.nome}</span>
                    <span className="text-[11px] font-semibold text-[color:var(--royal)] bg-[#eef4fb] px-1.5 py-0.5 rounded">{partidoLabel(c.partido_num)}</span>
                    <span className="tnum text-xs font-bold text-[color:var(--navy)] w-12 text-right">{fmtInt(c.votos)}</span>
                    <button onClick={(e) => { e.stopPropagation(); setSelReport(c); }} title="Relatório PDF do candidato" className="shrink-0 p-1 rounded-md text-[color:var(--muted)] opacity-0 group-hover:opacity-100 hover:bg-white hover:text-[color:var(--royal)] transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {selReport && (
        <CandidateModal
          cand={selReport}
          ctx={{ munNome: "Currais Novos", ano, codigoIbge: 2403103, totalNominais: C.total_nominais }}
          onClose={() => setSelReport(null)}
        />
      )}
    </div>
  );
}
