"use client";

import { useEffect, useState } from "react";
import { fmtInt, partidoLabel, type Candidato } from "../lib/data";
import { exportPDF } from "../lib/export";

// Contexto do candidato clicado (de qual município/ano ele veio).
export type CandCtx = {
  munNome: string;
  ano: number;
  codigoIbge: number | null;
  totalNominais: number;
};

// O detalhamento por seção só existe para Currais Novos 2024 (arquivo dedicado do TSE).
const CN_IBGE = 2403103;
type SecaoVoto = { zona: number; secao: number; sq: string; votos: number };
type SecaoAgg = { zona: number; secao: number; votos: number };

export default function CandidateModal({
  cand,
  ctx,
  onClose,
}: {
  cand: Candidato;
  ctx: CandCtx;
  onClose: () => void;
}) {
  const temSecoes = ctx.codigoIbge === CN_IBGE && ctx.ano === 2024;
  const [secoes, setSecoes] = useState<SecaoAgg[] | null>(null);
  const [loading, setLoading] = useState(temSecoes);

  useEffect(() => {
    if (!temSecoes) {
      setSecoes(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fetch("/data/eleicao/currais-novos-vereador-2024-secao.json")
      .then((r) => r.json())
      .then((d: { votos_por_secao: SecaoVoto[] }) => {
        if (!alive) return;
        const agg = new Map<string, SecaoAgg>();
        for (const v of d.votos_por_secao) {
          if (v.sq !== cand.sq) continue;
          const k = `${v.zona}-${v.secao}`;
          const cur = agg.get(k);
          if (cur) cur.votos += v.votos;
          else agg.set(k, { zona: v.zona, secao: v.secao, votos: v.votos });
        }
        setSecoes([...agg.values()].sort((a, b) => b.votos - a.votos));
        setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setSecoes([]);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [cand.sq, temSecoes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pct = ctx.totalNominais ? (cand.votos / ctx.totalNominais) * 100 : 0;
  const totalSecaoVotos = secoes?.reduce((a, s) => a + s.votos, 0) ?? 0;
  const topSecao = secoes && secoes.length ? secoes[0] : null;

  const doPDF = () => {
    const rows = (secoes ?? []).map((s, i) => [
      i + 1,
      `Zona ${s.zona}`,
      `Seção ${s.secao}`,
      fmtInt(s.votos),
      totalSecaoVotos ? ((s.votos / totalSecaoVotos) * 100).toFixed(1).replace(".", ",") + "%" : "—",
    ]);
    exportPDF({
      filename: `relatorio_${cand.nome.replace(/\s+/g, "_").toLowerCase()}_${ctx.ano}.pdf`,
      title: `${cand.nome} · Vereador · ${ctx.munNome} ${ctx.ano}`,
      subtitle: `${partidoLabel(cand.partido_num)} · nº ${cand.numero} · ${fmtInt(cand.votos)} votos · ${pct.toFixed(2)}% dos válidos`,
      kpis: [
        { label: "Votos totais", value: fmtInt(cand.votos) },
        { label: "% válidos", value: `${pct.toFixed(2)}%` },
        { label: "Seções com voto", value: temSecoes ? fmtInt(secoes?.length ?? 0) : "—" },
        {
          label: "Seção mais forte",
          value: topSecao ? `Z${topSecao.zona}·S${topSecao.secao} (${fmtInt(topSecao.votos)})` : "—",
        },
      ],
      table: {
        columns: ["#", "Zona", "Seção", "Votos", "% do candidato"],
        rows: rows.length ? rows : [["—", "—", "Sem detalhamento por seção", "—", "—"]],
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-2xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col rise">
        {/* cabeçalho */}
        <div className="p-5 sm:p-6 text-white relative shrink-0" style={{ background: "linear-gradient(120deg, var(--navy), var(--royal))" }}>
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/15" aria-label="Fechar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">Vereador · {ctx.munNome} · {ctx.ano}</div>
          <h3 className="text-xl sm:text-2xl font-extrabold mt-1 leading-tight pr-8">{cand.nome}</h3>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-full">{partidoLabel(cand.partido_num)}</span>
            <span className="text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-full">nº {cand.numero}</span>
            <span className="text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-full">rank {cand.rank}</span>
          </div>
        </div>

        {/* corpo */}
        <div className="p-5 sm:p-6 overflow-y-auto">
          <div className="grid grid-cols-3 gap-3 mb-5">
            <Stat label="Votos" value={fmtInt(cand.votos)} />
            <Stat label="% válidos" value={`${pct.toFixed(2)}%`} />
            <Stat label="Seções" value={temSecoes ? (loading ? "…" : fmtInt(secoes?.length ?? 0)) : "—"} />
          </div>

          {temSecoes ? (
            <>
              <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                <h4 className="text-sm font-bold text-[color:var(--navy)]">Seções onde teve votos</h4>
                {topSecao && (
                  <span className="text-xs text-[color:var(--muted)]">
                    Reduto: Zona {topSecao.zona} · Seção {topSecao.secao} ({fmtInt(topSecao.votos)})
                  </span>
                )}
              </div>
              {loading ? (
                <div className="py-10 text-center text-[color:var(--muted)] text-sm">Carregando seções…</div>
              ) : secoes && secoes.length ? (
                <div className="border border-[color:var(--line)] rounded-xl overflow-hidden">
                  <div className="max-h-[42vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[#f8fafd] z-10">
                        <tr className="text-left text-[11px] uppercase tracking-wide text-[color:var(--muted)] border-b border-[color:var(--line)]">
                          <th className="py-2.5 px-3 font-bold">Zona</th>
                          <th className="py-2.5 px-3 font-bold">Seção</th>
                          <th className="py-2.5 px-3 font-bold text-right">Votos</th>
                          <th className="py-2.5 px-3 font-bold text-right">% do candidato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {secoes.map((s) => {
                          const p = totalSecaoVotos ? (s.votos / totalSecaoVotos) * 100 : 0;
                          return (
                            <tr key={`${s.zona}-${s.secao}`} className="border-b border-[color:var(--line-2)]">
                              <td className="py-2 px-3 tnum">{s.zona}</td>
                              <td className="py-2 px-3 tnum font-semibold text-[color:var(--ink)]">{s.secao}</td>
                              <td className="py-2 px-3 text-right tnum font-bold text-[color:var(--navy)]">{fmtInt(s.votos)}</td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex items-center gap-2 justify-end">
                                  <div className="h-1.5 w-16 rounded-full bg-[#eef2f8] overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, p * 2)}%`, background: "linear-gradient(90deg, var(--royal-2), var(--navy))" }} />
                                  </div>
                                  <span className="tnum text-xs text-[color:var(--muted)] w-10 text-right">{p.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-[color:var(--muted)] text-sm">Sem registro de votos por seção para este candidato.</div>
              )}
            </>
          ) : (
            <div className="rounded-xl bg-[#f8fafd] border border-[color:var(--line)] p-4 text-sm text-[color:var(--muted)]">
              O detalhamento por seção está disponível para <b className="text-[color:var(--navy)]">Currais Novos (2024)</b>. Para os demais municípios e anos, o relatório traz o resumo do candidato.
            </div>
          )}
        </div>

        {/* rodapé */}
        <div className="p-4 sm:px-6 border-t border-[color:var(--line)] flex justify-between items-center gap-3 shrink-0">
          <span className="text-xs text-[color:var(--muted)] hidden sm:inline">Fonte: TSE · votação por seção</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="btn btn-ghost text-sm">Fechar</button>
            <button onClick={doPDF} className="btn btn-primary text-sm"><IconPdf /> Relatório PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 border border-[color:var(--line)] bg-[#f8fafd] text-center">
      <div className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
      <div className="text-lg font-bold tnum text-[color:var(--navy)] mt-0.5">{value}</div>
    </div>
  );
}

const IconPdf = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></svg>
);
