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

  const doPDF = () => {
    if (!pesquisa || !cenario || !cargo) return;
    exportPDF({
      filename: `pesquisa_${cargo.cargo.toLowerCase().replace(/\s+/g, "_")}_${pesquisa.instituto.replace(/[^\w]+/g, "_").toLowerCase()}_${pesquisa.data}.pdf`,
      title: `Pesquisa — ${cargo.cargo} RN 2026`,
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

      {!cargo || cargo.status === "sem_pesquisas" || !cargo.pesquisas.length ? (
        <Card className="p-10 text-center">
          <svg className="mx-auto text-[color:var(--muted)] mb-3" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <p className="text-[color:var(--navy)] font-bold">Sem pesquisas registradas para {cargo?.cargo}</p>
          <p className="text-[color:var(--muted)] text-sm mt-1 max-w-lg mx-auto">{data.meta.nota}</p>
        </Card>
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
