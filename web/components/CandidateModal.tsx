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

// O detalhamento por colégio (local de votação) existe para Currais Novos,
// nos anos com arquivo dedicado do TSE com coordenadas e nome do colégio.
const CN_IBGE = 2403103;
const CN_ANOS = [2016, 2020, 2024];

type LocalCN = { nr: string; nome: string; endereco?: string; bairro: string; eleitores: number; n_secoes: number };
type CandCN = { sq: string; por_local?: Record<string, number> };
type CNFile = { locais: LocalCN[]; vereador: { candidatos: CandCN[] }; prefeito: { candidatos: CandCN[] } };

// linha de votação por colégio, já com o nome do local
type Colegio = { nr: string; nome: string; bairro: string; n_secoes: number; eleitores: number; votos: number };

export default function CandidateModal({
  cand,
  ctx,
  onClose,
}: {
  cand: Candidato;
  ctx: CandCtx;
  onClose: () => void;
}) {
  const temColegios = ctx.codigoIbge === CN_IBGE && CN_ANOS.includes(ctx.ano);
  const [colegios, setColegios] = useState<Colegio[] | null>(null);
  const [loading, setLoading] = useState(temColegios);

  useEffect(() => {
    if (!temColegios) {
      setColegios(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fetch(`/data/eleicao/cn/currais-novos-${ctx.ano}.json`)
      .then((r) => r.json())
      .then((d: CNFile) => {
        if (!alive) return;
        const byNr = new Map(d.locais.map((l) => [l.nr, l]));
        // o mesmo candidato pode estar em vereador OU prefeito; procura nos dois
        const pool = [...d.vereador.candidatos, ...d.prefeito.candidatos];
        const found = pool.find((c) => c.sq === cand.sq);
        const porLocal = found?.por_local ?? {};
        const arr: Colegio[] = Object.entries(porLocal)
          .map(([nr, votos]) => {
            const l = byNr.get(nr);
            return {
              nr,
              nome: l?.nome ?? `Local ${nr}`,
              bairro: l?.bairro ?? "",
              n_secoes: l?.n_secoes ?? 0,
              eleitores: l?.eleitores ?? 0,
              votos: votos as number,
            };
          })
          .filter((c) => c.votos > 0)
          .sort((a, b) => b.votos - a.votos);
        setColegios(arr);
        setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setColegios([]);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [cand.sq, ctx.ano, temColegios]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const pct = ctx.totalNominais ? (cand.votos / ctx.totalNominais) * 100 : 0;
  const totalColegioVotos = colegios?.reduce((a, s) => a + s.votos, 0) ?? 0;
  const top = colegios && colegios.length ? colegios[0] : null;
  const maxVoto = colegios && colegios.length ? colegios[0].votos : 1;

  const doPDF = () => {
    const rows = (colegios ?? []).map((c, i) => [
      i + 1,
      c.nome,
      c.bairro || "—",
      fmtInt(c.votos),
      totalColegioVotos ? ((c.votos / totalColegioVotos) * 100).toFixed(1).replace(".", ",") + "%" : "—",
    ]);
    exportPDF({
      filename: `relatorio_${cand.nome.replace(/\s+/g, "_").toLowerCase()}_${ctx.ano}.pdf`,
      title: `${cand.nome} · ${ctx.munNome} ${ctx.ano}`,
      subtitle: `${partidoLabel(cand.partido_num)} · nº ${cand.numero} · ${fmtInt(cand.votos)} votos · ${pct.toFixed(2)}% dos válidos${top ? ` · reduto: ${top.nome}` : ""}`,
      kpis: [
        { label: "Votos totais", value: fmtInt(cand.votos) },
        { label: "% válidos", value: `${pct.toFixed(2)}%` },
        { label: "Colégios com voto", value: temColegios ? fmtInt(colegios?.length ?? 0) : "—" },
        { label: "Maior reduto", value: top ? `${top.nome.split(" ").slice(0, 2).join(" ")} (${fmtInt(top.votos)})` : "—" },
      ],
      table: {
        columns: ["#", "Colégio (local de votação)", "Bairro", "Votos", "% do candidato"],
        rows: rows.length ? rows : [["—", "Sem detalhamento por colégio", "—", "—", "—"]],
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-2xl max-h-[94vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col rise">
        {/* cabeçalho */}
        <div className="p-5 sm:p-6 text-white relative shrink-0" style={{ background: "linear-gradient(120deg, var(--navy), var(--royal))" }}>
          <button onClick={onClose} className="absolute top-3.5 right-3.5 p-2 rounded-lg hover:bg-white/15 active:scale-90 transition" aria-label="Fechar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">Candidato · {ctx.munNome} · {ctx.ano}</div>
          <h3 className="text-lg sm:text-2xl font-extrabold mt-1 leading-tight pr-10">{cand.nome}</h3>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-full">{partidoLabel(cand.partido_num)}</span>
            <span className="text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-full">nº {cand.numero}</span>
            <span className="text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-full">{cand.rank}º mais votado</span>
          </div>
        </div>

        {/* corpo */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
            <Stat label="Votos" value={fmtInt(cand.votos)} />
            <Stat label="% válidos" value={`${pct.toFixed(2)}%`} />
            <Stat label="Colégios" value={temColegios ? (loading ? "…" : fmtInt(colegios?.length ?? 0)) : "—"} />
          </div>

          {temColegios ? (
            <>
              <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                <h4 className="text-sm font-bold text-[color:var(--navy)]">Votação por colégio</h4>
                {top && (
                  <span className="text-[11px] sm:text-xs text-[color:var(--muted)]">
                    Maior reduto: <b className="text-[color:var(--navy)]">{top.nome}</b> ({fmtInt(top.votos)})
                  </span>
                )}
              </div>
              {loading ? (
                <div className="py-10 text-center text-[color:var(--muted)] text-sm">Carregando colégios…</div>
              ) : colegios && colegios.length ? (
                <div className="space-y-2">
                  {colegios.map((c, i) => {
                    const p = totalColegioVotos ? (c.votos / totalColegioVotos) * 100 : 0;
                    return (
                      <div key={c.nr} className="rounded-xl border border-[color:var(--line)] bg-[#fbfcfe] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 shrink-0 grid place-items-center rounded-md text-[10px] font-bold tnum text-white" style={{ background: i === 0 ? "var(--gold)" : "var(--royal)" }}>{i + 1}</span>
                              <span className="font-bold text-[13px] text-[color:var(--navy)] leading-tight">{c.nome}</span>
                            </div>
                            <div className="text-[11px] text-[color:var(--muted)] mt-0.5 ml-[26px]">
                              {c.bairro ? `${c.bairro} · ` : ""}{c.n_secoes ? `${c.n_secoes} seções · ` : ""}{fmtInt(c.eleitores)} eleitores
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="tnum font-extrabold text-[color:var(--navy)] leading-none">{fmtInt(c.votos)}</div>
                            <div className="tnum text-[11px] text-[color:var(--muted)]">{p.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="h-1.5 mt-2 rounded-full bg-[#eef2f8] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(4, (c.votos / maxVoto) * 100)}%`, background: i === 0 ? "linear-gradient(90deg, var(--gold), #d9a900)" : "linear-gradient(90deg, var(--royal-2), var(--navy))" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-[color:var(--muted)] text-sm">Sem registro de votos por colégio para este candidato.</div>
              )}
            </>
          ) : (
            <div className="rounded-xl bg-[#f8fafd] border border-[color:var(--line)] p-4 text-sm text-[color:var(--muted)]">
              O detalhamento por colégio está disponível para <b className="text-[color:var(--navy)]">Currais Novos</b> (2016, 2020 e 2024). Para os demais municípios e anos, o relatório traz o resumo do candidato.
            </div>
          )}
        </div>

        {/* rodapé */}
        <div className="p-3.5 sm:px-6 border-t border-[color:var(--line)] flex justify-between items-center gap-3 shrink-0 bg-white">
          <span className="text-xs text-[color:var(--muted)] hidden sm:inline">Fonte: TSE · votação por local</span>
          <div className="flex gap-2 ml-auto w-full sm:w-auto">
            <button onClick={onClose} className="btn btn-ghost text-sm flex-1 sm:flex-none justify-center">Fechar</button>
            <button onClick={doPDF} className="btn btn-primary text-sm flex-1 sm:flex-none justify-center"><IconPdf /> Relatório PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-2.5 sm:p-3 border border-[color:var(--line)] bg-[#f8fafd] text-center">
      <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
      <div className="text-base sm:text-lg font-bold tnum text-[color:var(--navy)] mt-0.5">{value}</div>
    </div>
  );
}

const IconPdf = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></svg>
);
