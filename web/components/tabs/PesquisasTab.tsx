"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, SectionTitle } from "../ui";
import { fmtInt } from "../../lib/data";
import { exportPDF } from "../../lib/export";

type Cand = { nome: string; partido: string | null; pct: number };
type Cenario = { nome: string; tipo?: string | null; candidatos: Cand[] };
type Pesquisa = {
  instituto: string;
  contratante: string | null;
  registro_tse: string | null;
  data: string;
  amostra: number | null;
  margem_erro_pp: number | null;
  fonte_url: string;
  cenarios: Cenario[];
};
type Cargo = { cargo: string; status: string; pesquisas: Pesquisa[] };
type PesquisasFile = { meta: { nota?: string; accessedAt?: string }; cargos: Cargo[] };

const fmtData = (s: string) => {
  const [y, m, d] = s.split("-");
  return d ? `${d}/${m}/${y}` : s;
};

export default function PesquisasTab() {
  const [data, setData] = useState<PesquisasFile | null>(null);
  const [erro, setErro] = useState(false);
  const [cargoIdx, setCargoIdx] = useState(0);
  const [pIdx, setPIdx] = useState(0);
  const [cIdx, setCIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/data/eleicao/pesquisas-rn-2026.json")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d: PesquisasFile) => alive && setData(d))
      .catch(() => alive && setErro(true));
    return () => {
      alive = false;
    };
  }, []);

  const cargo = data?.cargos[cargoIdx];
  const pesquisa = cargo?.pesquisas[pIdx];
  const cenario = pesquisa?.cenarios[cIdx];

  // líder da pesquisa mais recente do cargo
  const lider = useMemo(() => {
    const p0 = cargo?.pesquisas[0]?.cenarios[0]?.candidatos;
    if (!p0?.length) return null;
    return p0.reduce((a, c) => (c.pct > a.pct ? c : a), p0[0]);
  }, [cargo]);

  const [mode, setMode] = useState<"single" | "compare">("single");
  const [seen, setSeen] = useState<string>("");
  const latest = useMemo(() => {
    let d = "";
    for (const c of data?.cargos ?? []) for (const p of c.pesquisas) if (p.data > d) d = p.data;
    return d;
  }, [data]);
  useEffect(() => {
    if (!latest) return;
    const prev = localStorage.getItem("rnanalytics_last_poll") || "";
    setSeen(prev);
    if (!prev) localStorage.setItem("rnanalytics_last_poll", latest);
  }, [latest]);
  const hasNew = !!latest && !!seen && latest > seen;
  const markSeen = () => { localStorage.setItem("rnanalytics_last_poll", latest); setSeen(latest); };

  const doPDF = () => {
    if (!pesquisa || !cenario || !cargo) return;
    exportPDF({
      filename: `pesquisa_${cargo.cargo.toLowerCase().replace(/\s+/g, "_")}_${pesquisa.instituto.replace(/[^\w]+/g, "_").toLowerCase()}_${pesquisa.data}.pdf`,
      title: `Pesquisa para ${cargo.cargo} · RN 2026`,
      subtitle: `${pesquisa.instituto}${pesquisa.contratante ? ` · ${pesquisa.contratante}` : ""} · ${fmtData(pesquisa.data)} · ${cenario.nome}`,
      kpis: [
        { label: "Amostra", value: pesquisa.amostra ? fmtInt(pesquisa.amostra) : "—" },
        { label: "Margem", value: pesquisa.margem_erro_pp ? `±${pesquisa.margem_erro_pp} pp` : "—" },
        { label: "Registro TSE", value: pesquisa.registro_tse ?? "não informado" },
        { label: "Líder", value: cenario.candidatos[0]?.nome.split(" ").slice(0, 2).join(" ") ?? "—" },
      ],
      table: {
        columns: ["Candidato", "Partido", "Intenção de voto"],
        rows: cenario.candidatos.map((c) => [c.nome, c.partido ?? "—", `${c.pct}%`]),
      },
    });
  };

  if (erro)
    return (
      <Card className="p-12 text-center mt-6">
        <p className="text-[color:var(--navy)] font-bold">Dados de pesquisas indisponíveis</p>
        <p className="text-[color:var(--muted)] text-sm mt-1">O arquivo de pesquisas ainda não foi publicado.</p>
      </Card>
    );

  if (!data)
    return (
      <Card className="p-16 text-center mt-6">
        <div className="inline-block w-6 h-6 border-[3px] border-[color:var(--line)] border-t-[color:var(--royal)] rounded-full animate-spin" />
        <p className="text-[color:var(--muted)] mt-3 text-sm">Carregando pesquisas registradas…</p>
      </Card>
    );

  const maxPct = cenario ? Math.max(...cenario.candidatos.map((c) => c.pct), 1) : 1;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <SectionTitle
          kicker="Eleições 2026 · RN"
          title="Pesquisas eleitorais"
          desc="Intenção de voto para Governador, Senado e demais cargos, a partir das pesquisas registradas no TSE e divulgadas pelos institutos. Selecione o cargo e a pesquisa."
        />
        {pesquisa && cenario && (
          <button onClick={doPDF} className="btn btn-ghost text-sm">
            <IconPdf /> Exportar cenário
          </button>
        )}
      </div>

      {hasNew && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[color:var(--green)] bg-[#eafaf0] px-4 py-3">
          <div className="text-sm text-[color:var(--navy)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[color:var(--green)] animate-pulse" />
            <span><b>Pesquisa nova registrada</b> desde sua última visita (mais recente: {fmtData(latest)}).</span>
          </div>
          <button onClick={markSeen} className="text-xs font-semibold text-[color:var(--royal)] shrink-0">marcar como visto</button>
        </div>
      )}

      {/* seletor de cargo */}
      <div className="segment mb-5 flex-wrap">
        {data.cargos.map((c, i) => (
          <button
            key={c.cargo}
            data-active={cargoIdx === i}
            onClick={() => {
              setCargoIdx(i);
              setPIdx(0);
              setCIdx(0);
            }}
          >
            {c.cargo}
            {c.status === "sem_pesquisas" && <span className="opacity-50"> · —</span>}
          </button>
        ))}
      </div>

      {cargo && cargo.status !== "sem_pesquisas" && cargo.pesquisas.length > 0 && (
        <div className="segment mb-5">
          <button data-active={mode === "single"} onClick={() => setMode("single")}>Por pesquisa</button>
          <button data-active={mode === "compare"} onClick={() => setMode("compare")}>Comparar pesquisas</button>
        </div>
      )}

      {!cargo || cargo.status === "sem_pesquisas" || !cargo.pesquisas.length ? (
        <Card className="p-10 text-center">
          <svg className="mx-auto text-[color:var(--muted)] mb-3" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <p className="text-[color:var(--navy)] font-bold">Sem pesquisas registradas para {cargo?.cargo}</p>
          <p className="text-[color:var(--muted)] text-sm mt-1 max-w-lg mx-auto">{data.meta.nota}</p>
        </Card>
      ) : mode === "compare" ? (
        <CompareCargo cargo={cargo} />
      ) : (
        <>
          {/* KPIs */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <KPI label="Pesquisas" value={fmtInt(cargo.pesquisas.length)} />
            <KPI label="Mais recente" value={fmtData(cargo.pesquisas[0].data)} />
            <KPI label="Líder atual" value={lider ? `${lider.nome.split(" ").slice(0, 2).join(" ")} · ${lider.pct}%` : "—"} />
            <KPI label="Institutos" value={fmtInt(new Set(cargo.pesquisas.map((p) => p.instituto)).size)} />
          </section>

          <div className="grid lg:grid-cols-[1fr_1.6fr] gap-4">
            {/* lista de pesquisas */}
            <Card className="p-0 overflow-hidden self-start">
              <div className="px-4 py-3 border-b border-[color:var(--line)]">
                <h4 className="text-sm font-bold text-[color:var(--navy)]">Pesquisas ({cargo.cargo})</h4>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {cargo.pesquisas.map((p, i) => (
                  <button
                    key={`${p.instituto}-${p.data}-${i}`}
                    onClick={() => {
                      setPIdx(i);
                      setCIdx(0);
                    }}
                    className="w-full text-left px-4 py-3 border-b border-[color:var(--line-2)] hover:bg-[#f8fafd] transition"
                    style={{ background: pIdx === i ? "rgba(12,82,154,0.07)" : undefined }}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-semibold text-sm text-[color:var(--ink)]">{p.instituto}</span>
                      <span className="text-xs tnum text-[color:var(--muted)]">{fmtData(p.data)}</span>
                    </div>
                    <div className="text-[11px] text-[color:var(--muted)] mt-0.5">
                      {p.amostra ? `${fmtInt(p.amostra)} entrevistas` : "amostra n/d"}
                      {p.margem_erro_pp ? ` · ±${p.margem_erro_pp}pp` : ""}
                      {p.registro_tse ? ` · TSE ${p.registro_tse}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* detalhe da pesquisa */}
            {pesquisa && cenario && (
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                  <div>
                    <h4 className="text-base font-extrabold text-[color:var(--navy)]">{pesquisa.instituto}</h4>
                    <p className="text-xs text-[color:var(--muted)]">
                      {pesquisa.contratante ? `Contratante: ${pesquisa.contratante} · ` : ""}
                      {fmtData(pesquisa.data)}
                      {pesquisa.registro_tse ? ` · Registro TSE ${pesquisa.registro_tse}` : " · registro não informado"}
                    </p>
                  </div>
                  <a href={pesquisa.fonte_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[color:var(--royal)] shrink-0">
                    Ver fonte ↗
                  </a>
                </div>

                {/* seletor de cenário */}
                {pesquisa.cenarios.length > 1 && (
                  <div className="segment my-3 flex-wrap">
                    {pesquisa.cenarios.map((c, i) => (
                      <button key={c.nome + i} data-active={cIdx === i} onClick={() => setCIdx(i)}>
                        {c.nome}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  {cenario.candidatos.map((c, i) => (
                    <div key={c.nome}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-[color:var(--ink)]">
                          {c.nome}
                          {c.partido && <span className="text-xs font-semibold text-[color:var(--royal)] bg-[#eef4fb] px-1.5 py-0.5 rounded ml-2">{c.partido}</span>}
                        </span>
                        <span className="tnum font-bold text-[color:var(--navy)]">{c.pct}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-[#eef2f8] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(c.pct / maxPct) * 100}%`,
                            background: i === 0 ? "linear-gradient(90deg, var(--gold), var(--green))" : "linear-gradient(90deg, var(--green), var(--royal))",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-[color:var(--muted)] mt-5 pt-3 border-t border-[color:var(--line-2)]">
                  {cenario.tipo ? `Pesquisa ${cenario.tipo}. ` : ""}
                  Margem de erro {pesquisa.margem_erro_pp ? `de ±${pesquisa.margem_erro_pp} pontos percentuais` : "não informada"}
                  {pesquisa.amostra ? `, amostra de ${fmtInt(pesquisa.amostra)} entrevistas` : ""}. Dados divulgados pelo instituto; consulte a fonte oficial.
                </p>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3.5 border border-[color:var(--line)] bg-[#f8fafd]">
      <div className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
      <div className="text-[15px] font-bold text-[color:var(--navy)] mt-1">{value}</div>
    </div>
  );
}

const IconPdf = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></svg>
);

// ===== Comparar várias pesquisas (matriz candidato × pesquisa + drill-down) =====
function CompareCargo({ cargo }: { cargo: Cargo }) {
  const polls = cargo.pesquisas;
  const [sel, setSel] = useState<number[]>(polls.map((_, i) => i).slice(0, 6));
  const [cand, setCand] = useState<string | null>(null);
  const selPolls = sel.slice().sort((a, b) => a - b).map((i) => polls[i]).filter(Boolean);

  const candNames = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of selPolls) for (const c of p.cenarios[0]?.candidatos ?? []) m.set(c.nome, (m.get(c.nome) ?? 0) + c.pct);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [selPolls]);

  const pctOf = (p: Pesquisa, nome: string) => p.cenarios[0]?.candidatos.find((c) => c.nome === nome)?.pct ?? null;
  const mediaOf = (nome: string) => {
    const vals = selPolls.map((p) => pctOf(p, nome)).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const maxCell = Math.max(1, ...candNames.flatMap((n) => selPolls.map((p) => pctOf(p, n) ?? 0)));
  const cellBg = (v: number | null) => (v == null ? "transparent" : `rgba(12,82,154,${0.06 + (v / maxCell) * 0.82})`);
  const cellFg = (v: number | null) => (v != null && v / maxCell > 0.5 ? "#fff" : "var(--ink)");
  const toggle = (i: number) => setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

  const serie = cand
    ? selPolls.slice().sort((a, b) => a.data.localeCompare(b.data)).map((p) => ({ label: `${p.instituto.split("/")[0]} ${fmtData(p.data).slice(0, 5)}`, pct: pctOf(p, cand) }))
    : [];

  // ===== insights automáticos do comparativo =====
  const insights = useMemo(() => {
    if (selPolls.length < 1 || !candNames.length) return [];
    const out: string[] = [];
    const ordenadasData = selPolls.slice().sort((a, b) => a.data.localeCompare(b.data));
    const liderMedia = candNames.map((n) => ({ n, m: mediaOf(n) })).sort((a, b) => b.m - a.m);
    if (liderMedia[0]) out.push(`Na média de ${selPolls.length} pesquisa(s), ${liderMedia[0].n} lidera com ${liderMedia[0].m.toFixed(1)}%.`);
    if (liderMedia[1]) {
      const dif = liderMedia[0].m - liderMedia[1].m;
      out.push(`Diferença para o 2º colocado (${liderMedia[1].n}): ${dif.toFixed(1)} pontos.`);
    }
    // maior variação entre a primeira e a última pesquisa selecionada
    if (ordenadasData.length >= 2) {
      const a = ordenadasData[0], z = ordenadasData[ordenadasData.length - 1];
      let melhor: { n: string; d: number } | null = null;
      for (const n of candNames) {
        const va = pctOf(a, n), vz = pctOf(z, n);
        if (va != null && vz != null) {
          const d = vz - va;
          if (!melhor || Math.abs(d) > Math.abs(melhor.d)) melhor = { n, d };
        }
      }
      if (melhor) out.push(`Maior movimento entre ${fmtData(a.data)} e ${fmtData(z.data)}: ${melhor.n} ${melhor.d >= 0 ? "subiu" : "caiu"} ${Math.abs(melhor.d).toFixed(1)} ponto(s).`);
    }
    const semRegistro = selPolls.filter((p) => !p.registro_tse).length;
    if (semRegistro) out.push(`${semRegistro} de ${selPolls.length} pesquisa(s) sem registro do TSE informado; confira a fonte antes de citar.`);
    return out;
  }, [selPolls, candNames]);

  const doPDF = () => {
    if (!selPolls.length || !candNames.length) return;
    exportPDF({
      filename: `comparativo_pesquisas_${cargo.cargo.toLowerCase().replace(/\s+/g, "_")}_rn2026.pdf`,
      title: `Comparativo de pesquisas · ${cargo.cargo} · RN 2026`,
      subtitle: `${selPolls.length} pesquisas cruzadas: ${selPolls.map((p) => `${p.instituto.split("/")[0]} (${fmtData(p.data)})`).join(", ")}`,
      intro: insights.join("  "),
      kpis: [
        { label: "Pesquisas", value: fmtInt(selPolls.length) },
        { label: "Candidatos", value: fmtInt(candNames.length) },
        { label: "Líder (média)", value: candNames.map((n) => ({ n, m: mediaOf(n) })).sort((a, b) => b.m - a.m)[0]?.n.split(" ").slice(0, 2).join(" ") ?? "—" },
        { label: "Período", value: `${fmtData(selPolls.slice().sort((a, b) => a.data.localeCompare(b.data))[0].data)} a ${fmtData(selPolls.slice().sort((a, b) => a.data.localeCompare(b.data))[selPolls.length - 1].data)}` },
      ],
      table: {
        columns: ["Candidato", ...selPolls.map((p) => `${p.instituto.split("/")[0]} ${fmtData(p.data).slice(0, 5)}`), "Média"],
        rows: candNames.map((n) => [n, ...selPolls.map((p) => { const v = pctOf(p, n); return v == null ? "—" : `${v}%`; }), `${mediaOf(n).toFixed(1)}%`]),
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button onClick={doPDF} className="btn btn-primary text-sm">
          <IconPdf /> Exportar comparativo (PDF)
        </button>
      </div>
      <Card className="p-4">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--muted)] mb-2">Pesquisas no comparativo ({selPolls.length})</div>
        <div className="flex flex-wrap gap-1.5">
          {polls.map((p, i) => {
            const on = sel.includes(i);
            return (
              <button key={`${p.instituto}-${p.data}-${i}`} onClick={() => toggle(i)} className="chip-i text-xs font-semibold px-2.5 py-1.5 rounded-full border"
                style={{ background: on ? "var(--navy)" : "#fff", color: on ? "#fff" : "var(--ink-2)", borderColor: on ? "var(--navy)" : "var(--line)" }}>
                {p.instituto.split("/")[0]} · {fmtData(p.data)}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-[color:var(--line)]">
          <h4 className="text-sm font-bold text-[color:var(--navy)]">Comparativo de intenção de voto</h4>
          <p className="text-xs text-[color:var(--muted)]">Clique num candidato para ver a evolução dele entre as pesquisas.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-[color:var(--muted)] border-b border-[color:var(--line)]">
                <th className="text-left p-2.5 sticky left-0 bg-white font-bold">Candidato</th>
                {selPolls.map((p, i) => (
                  <th key={i} className="p-2 font-bold text-center min-w-[78px] text-[color:var(--navy)]">
                    {p.instituto.split("/")[0]}<br />
                    <span className="font-normal text-[color:var(--muted)]">{fmtData(p.data).slice(0, 5)}</span>
                  </th>
                ))}
                <th className="p-2 font-bold text-center text-[color:var(--royal)]">Média</th>
              </tr>
            </thead>
            <tbody>
              {candNames.map((n) => (
                <tr key={n} onClick={() => setCand(cand === n ? null : n)} className="row-click border-b border-[color:var(--line-2)]" style={{ background: cand === n ? "rgba(12,82,154,0.06)" : undefined }}>
                  <td className="p-2.5 font-semibold text-[color:var(--ink)] sticky left-0 bg-white truncate max-w-[170px]">{n}</td>
                  {selPolls.map((p, i) => {
                    const v = pctOf(p, n);
                    return <td key={i} className="p-2 text-center tnum font-bold" style={{ background: cellBg(v), color: cellFg(v) }}>{v == null ? "" : v.toFixed(0)}</td>;
                  })}
                  <td className="p-2 text-center tnum font-extrabold text-[color:var(--royal)]">{mediaOf(n).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {insights.length > 0 && (
        <Card className="p-5">
          <h4 className="text-sm font-bold text-[color:var(--navy)] mb-2 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--royal)" strokeWidth="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" /></svg>
            Leitura do comparativo
          </h4>
          <ul className="space-y-1.5">
            {insights.map((t, i) => (
              <li key={i} className="text-sm text-[color:var(--ink-2)] flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--royal)] mt-2 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {cand && serie.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-[color:var(--navy)]">Evolução de {cand} entre as pesquisas</h4>
            <button onClick={() => setCand(null)} className="text-xs font-semibold text-[color:var(--royal)]">fechar</button>
          </div>
          <MiniLine points={serie} />
        </Card>
      )}
    </div>
  );
}

function MiniLine({ points }: { points: { label: string; pct: number | null }[] }) {
  const vals = points.map((p) => p.pct ?? 0);
  const maxV = Math.max(10, ...vals) * 1.1;
  const W = 640, H = 240, pad = { l: 30, r: 16, t: 18, b: 46 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / maxV) * ih;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {[0, 0.5, 1].map((g) => <line key={g} x1={pad.l} x2={W - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g} stroke="#eef1f7" />)}
      <path d={points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.pct ?? 0)}`).join(" ")} fill="none" stroke="var(--royal)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.pct ?? 0)} r="4" fill="#fff" stroke="var(--royal)" strokeWidth="2.4" />
          <text x={x(i)} y={y(p.pct ?? 0) - 10} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--navy)">{p.pct == null ? "" : p.pct.toFixed(0)}</text>
          <text x={x(i)} y={H - 16} textAnchor="middle" fontSize="9" fill="#5b6577">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}
