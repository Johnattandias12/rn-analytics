"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Bundle } from "../App";
import { Card, SectionTitle } from "../ui";
import { partidoLabel, type MunicipioVereador, type SeridoVereador } from "../../lib/data";

const ANOS = [2012, 2016, 2020, 2024];
const ALVO = 2028; // próxima eleição municipal (vereador)

type ShareByYear = Record<number, number>;

// regressão linear simples (mínimos quadrados) — projeta y em x = xq
function linProject(points: { x: number; y: number }[], xq: number) {
  const n = points.length;
  const xm = points.reduce((a, p) => a + p.x, 0) / n;
  const ym = points.reduce((a, p) => a + p.y, 0) / n;
  let num = 0,
    den = 0;
  for (const p of points) {
    num += (p.x - xm) * (p.y - ym);
    den += (p.x - xm) ** 2;
  }
  const slope = den ? num / den : 0;
  return ym - slope * xm + slope * xq;
}

function sharesForMun(mun: MunicipioVereador | undefined): Map<string, number> {
  const m = new Map<string, number>();
  if (!mun) return m;
  const tot = mun.total_votos_nominais || mun.candidatos.reduce((a, c) => a + c.votos, 0);
  for (const c of mun.candidatos) m.set(c.partido_num, (m.get(c.partido_num) ?? 0) + c.votos);
  if (tot) for (const [k, v] of m) m.set(k, (v / tot) * 100);
  return m;
}

// ---- pesquisas 2026 (gancho híbrido; carrega se o arquivo existir) ----
type Pesquisa = {
  instituto: string;
  registro_tse: string | null;
  data: string;
  amostra: number | null;
  margem_erro_pp: number | null;
  fonte_url: string;
  cenarios: { nome: string; candidatos: { nome: string; partido: string | null; pct: number }[] }[];
};
type PesquisasFile = { cargos: { cargo: string; status: string; pesquisas: Pesquisa[] }[] };

export default function PredictionTab({ b }: { b: Bundle }) {
  const [munCod, setMunCod] = useState(2403103); // Currais Novos
  const cache = useRef<Map<number, SeridoVereador>>(new Map([[2024, b.serido]]));
  const [byYear, setByYear] = useState<Record<number, SeridoVereador | null>>({
    2012: null,
    2016: null,
    2020: null,
    2024: b.serido,
  });
  const [swing, setSwing] = useState<Record<string, number>>({});
  const [pesq, setPesq] = useState<PesquisasFile | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all(
      ANOS.map(async (y) => {
        if (cache.current.has(y)) return [y, cache.current.get(y)!] as const;
        const r = await fetch(`/data/eleicao/serido-vereador-${y}.json`);
        const d: SeridoVereador = await r.json();
        cache.current.set(y, d);
        return [y, d] as const;
      })
    ).then((pairs) => {
      if (!alive) return;
      const o: Record<number, SeridoVereador> = {} as Record<number, SeridoVereador>;
      for (const [y, d] of pairs) o[y] = d;
      setByYear(o);
    });
    return () => {
      alive = false;
    };
  }, [b.serido]);

  // tenta carregar pesquisas 2026 (silencioso se ainda não existir)
  useEffect(() => {
    let alive = true;
    fetch("/data/eleicao/pesquisas-rn-2026.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setPesq(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const muns = useMemo(
    () => b.serido.municipios.slice().sort((a, z) => a.nome.localeCompare(z.nome, "pt-BR")),
    [b.serido]
  );
  const munNome = muns.find((m) => m.codigo_ibge === munCod)?.nome ?? "—";
  const ready = ANOS.every((y) => byYear[y]);

  const partyYearShare = useMemo(() => {
    const map = new Map<string, ShareByYear>();
    if (!ready) return map;
    for (const y of ANOS) {
      const mun = byYear[y]!.municipios.find((m) => m.codigo_ibge === munCod);
      for (const [p, val] of sharesForMun(mun)) {
        if (!map.has(p)) map.set(p, {});
        map.get(p)![y] = val;
      }
    }
    return map;
  }, [ready, byYear, munCod]);

  // projeção base (tendência) + volatilidade
  const projection = useMemo(() => {
    const arr = [...partyYearShare.entries()].map(([p, sh]) => {
      const pts = ANOS.map((y) => ({ x: y, y: sh[y] ?? 0 }));
      const projRaw = Math.max(0, linProject(pts, ALVO));
      const diffs: number[] = [];
      for (let i = 1; i < ANOS.length; i++) diffs.push((sh[ANOS[i]] ?? 0) - (sh[ANOS[i - 1]] ?? 0));
      const vol = Math.sqrt(diffs.reduce((a, d) => a + d * d, 0) / diffs.length);
      return { p, last: sh[2024] ?? 0, projRaw, vol, sh };
    });
    const sum = arr.reduce((a, x) => a + x.projRaw, 0) || 1;
    return arr
      .map((x) => ({ ...x, proj: (x.projRaw / sum) * 100 }))
      .sort((a, z) => z.proj - a.proj);
  }, [partyYearShare]);

  // aplica o swing do simulador e renormaliza
  const simulated = useMemo(() => {
    const arr = projection.map((x) => ({ ...x, sim: Math.max(0, x.proj + (swing[x.p] ?? 0)) }));
    const sum = arr.reduce((a, x) => a + x.sim, 0) || 1;
    return arr.map((x) => ({ ...x, sim: (x.sim / sum) * 100 })).sort((a, z) => z.sim - a.sim);
  }, [projection, swing]);

  const topParties = projection.slice(0, 8);
  const algumSwing = Object.values(swing).some((v) => v);
  const maxSim = simulated[0]?.sim ?? 1;

  const govPesquisa = pesq?.cargos.find((c) => c.cargo === "Governador" && c.pesquisas.length)?.pesquisas[0];

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <SectionTitle
          kicker="Inteligência preditiva"
          title={`Projeções & cenários — ${munNome}`}
          desc="Projeção das próximas eleições de vereador (2028) a partir da tendência 2012–2024, com simulador de cenários. É uma estimativa estatística, não uma previsão garantida."
        />
        <select
          value={munCod}
          onChange={(e) => {
            setMunCod(Number(e.target.value));
            setSwing({});
          }}
          className="py-2.5 px-3 rounded-xl border border-[color:var(--line)] bg-white text-sm font-semibold text-[color:var(--navy)]"
        >
          {muns.map((m) => (
            <option key={m.cd_tse} value={m.codigo_ibge ?? 0}>
              {m.nome}
            </option>
          ))}
        </select>
      </div>

      {!ready ? (
        <Card className="p-16 text-center">
          <div className="inline-block w-6 h-6 border-[3px] border-[color:var(--line)] border-t-[color:var(--royal)] rounded-full animate-spin" />
          <p className="text-[color:var(--muted)] mt-3 text-sm">Carregando série histórica (2012–2024)…</p>
        </Card>
      ) : (
        <>
          {/* método / ressalva */}
          <div className="rounded-xl border border-[color:var(--line)] bg-[#f8fafd] p-4 mb-5 text-sm text-[color:var(--muted)] flex gap-3">
            <svg className="shrink-0 mt-0.5 text-[color:var(--royal)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
            <p>
              Método: regressão linear da participação (%) de cada partido nos votos nominais ao longo de 2012, 2016, 2020 e 2024, projetada para {ALVO} e renormalizada para 100%. Use o simulador para testar cenários de migração de votos. A faixa de variação histórica (±) indica a volatilidade de cada partido.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
            {/* projeção / cenário simulado */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-[color:var(--navy)]">
                  {algumSwing ? `Cenário simulado · ${ALVO}` : `Projeção base · ${ALVO}`}
                </h4>
                {algumSwing && (
                  <button onClick={() => setSwing({})} className="text-xs font-semibold text-[color:var(--royal)]">
                    Limpar simulação
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {simulated.slice(0, 10).map((x, i) => {
                  const delta = x.sim - x.proj;
                  return (
                    <div key={x.p}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-[color:var(--ink)]">
                          <span className="tnum text-[color:var(--muted)] mr-1.5">{i + 1}.</span>
                          {partidoLabel(x.p)}
                        </span>
                        <span className="tnum font-bold text-[color:var(--navy)]">
                          {x.sim.toFixed(1)}%
                          {algumSwing && Math.abs(delta) >= 0.1 && (
                            <span className={delta > 0 ? "text-[color:var(--green)] ml-1.5" : "text-red-500 ml-1.5"}>
                              {delta > 0 ? "▲" : "▼"}
                              {Math.abs(delta).toFixed(1)}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-[#eef2f8] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(3, (x.sim / maxSim) * 100)}%`,
                            background: i === 0 ? "linear-gradient(90deg, var(--gold), var(--green))" : "linear-gradient(90deg, var(--green), var(--royal))",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* simulador de swing */}
            <Card className="p-5 self-start">
              <h4 className="text-sm font-bold text-[color:var(--navy)] mb-1">Simulador de cenários</h4>
              <p className="text-xs text-[color:var(--muted)] mb-4">Ajuste a tendência de cada partido (em pontos percentuais) e veja o ranking recalcular ao vivo.</p>
              <div className="space-y-3.5">
                {topParties.map((x) => {
                  const v = swing[x.p] ?? 0;
                  return (
                    <div key={x.p}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-[color:var(--ink)]">{partidoLabel(x.p)}</span>
                        <span className="tnum text-[color:var(--muted)]">
                          base {x.proj.toFixed(1)}% · vol ±{x.vol.toFixed(1)}
                          <span className={`ml-2 font-bold ${v > 0 ? "text-[color:var(--green)]" : v < 0 ? "text-red-500" : "text-[color:var(--navy)]"}`}>
                            {v > 0 ? "+" : ""}
                            {v}
                          </span>
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-15}
                        max={15}
                        step={0.5}
                        value={v}
                        onChange={(e) => setSwing((s) => ({ ...s, [x.p]: Number(e.target.value) }))}
                        className="w-full accent-[color:var(--royal)]"
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* tabela histórica + projeção */}
          <Card className="p-0 overflow-hidden mt-4">
            <div className="px-5 py-4 border-b border-[color:var(--line)]">
              <h4 className="text-sm font-bold text-[color:var(--navy)]">Participação por partido (%) — histórico e projeção</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-[color:var(--muted)] border-b border-[color:var(--line)]">
                    <th className="py-3 px-5 font-bold">Partido</th>
                    {ANOS.map((y) => (
                      <th key={y} className="py-3 px-3 font-bold text-right">{y}</th>
                    ))}
                    <th className="py-3 px-3 font-bold text-right text-[color:var(--royal)]">Proj. {ALVO}</th>
                    {algumSwing && <th className="py-3 px-5 font-bold text-right text-[color:var(--green)]">Simulado</th>}
                  </tr>
                </thead>
                <tbody>
                  {simulated.slice(0, 12).map((x) => (
                    <tr key={x.p} className="border-b border-[color:var(--line-2)] hover:bg-[#f8fafd]">
                      <td className="py-2.5 px-5 font-semibold text-[color:var(--ink)]">{partidoLabel(x.p)}</td>
                      {ANOS.map((y) => (
                        <td key={y} className="py-2.5 px-3 text-right tnum text-[color:var(--muted)]">
                          {(x.sh[y] ?? 0).toFixed(1)}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-right tnum font-bold text-[color:var(--royal)]">{x.proj.toFixed(1)}</td>
                      {algumSwing && <td className="py-2.5 px-5 text-right tnum font-bold text-[color:var(--green)]">{x.sim.toFixed(1)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* gancho híbrido: cenário 2026 das pesquisas (estadual) */}
          {govPesquisa && govPesquisa.cenarios[0] && (
            <Card className="p-5 mt-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                <h4 className="text-sm font-bold text-[color:var(--navy)]">Cenário 2026 — Governador do RN (pesquisa)</h4>
                <a href={govPesquisa.fonte_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[color:var(--royal)]">
                  {govPesquisa.instituto} · {govPesquisa.data}
                </a>
              </div>
              <p className="text-xs text-[color:var(--muted)] mb-4">
                {govPesquisa.cenarios[0].nome}
                {govPesquisa.registro_tse ? ` · registro TSE ${govPesquisa.registro_tse}` : ""}
                {govPesquisa.amostra ? ` · amostra ${govPesquisa.amostra}` : ""}
                {govPesquisa.margem_erro_pp ? ` · margem ±${govPesquisa.margem_erro_pp}pp` : ""}
              </p>
              <div className="space-y-2.5">
                {govPesquisa.cenarios[0].candidatos.map((c) => {
                  const max = Math.max(...govPesquisa.cenarios[0].candidatos.map((k) => k.pct)) || 1;
                  return (
                    <div key={c.nome}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-[color:var(--ink)]">{c.nome}{c.partido ? ` (${c.partido})` : ""}</span>
                        <span className="tnum font-bold text-[color:var(--navy)]">{c.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#eef2f8] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(c.pct / max) * 100}%`, background: "linear-gradient(90deg, var(--royal-2), var(--navy))" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
