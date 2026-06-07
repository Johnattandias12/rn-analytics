"use client";

import { useEffect, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";
import type { Socio, SeridoVereador } from "../lib/data";
import OverviewTab from "./tabs/OverviewTab";
import MapTab from "./tabs/MapTab";
import PesquisasTab from "./tabs/PesquisasTab";
import VereadoresTab from "./tabs/VereadoresTab";
import AnaliseTab from "./tabs/AnaliseTab";
import TendenciasTab from "./tabs/TendenciasTab";
import SobreTab from "./tabs/SobreTab";

export type Bundle = {
  geo: FeatureCollection<Geometry, { codarea: string }>;
  socio: Socio[];
  serido: SeridoVereador;
  socioByCode: Map<number, Socio>;
  seridoSet: Set<number>;
  nameByCode: Map<number, string>;
};

export type SectionId = "visao" | "mapa" | "pesquisas" | "vereadores" | "analise" | "tendencias" | "sobre";

type Item = { id: SectionId; label: string; desc: string; icon: (a: boolean) => React.ReactNode };
const GROUPS: { grupo: string; itens: Item[] }[] = [
  { grupo: "Panorama do RN", itens: [
    { id: "visao", label: "Visão Geral", desc: "Resumo e mapa do estado", icon: (a) => <IGrid a={a} /> },
    { id: "mapa", label: "Mapa do RN", desc: "167 municípios", icon: (a) => <IMap a={a} /> },
    { id: "pesquisas", label: "Pesquisas 2026", desc: "Governo, Senado e mais", icon: (a) => <IPoll a={a} /> },
  ]},
  { grupo: "Currais Novos & Seridó", itens: [
    { id: "vereadores", label: "Vereadores", desc: "Lista, filtros e relatórios", icon: (a) => <IUsers a={a} /> },
    { id: "analise", label: "Análise", desc: "Redutos por seção + insights", icon: (a) => <IPin a={a} /> },
    { id: "tendencias", label: "Tendências", desc: "Evolução + projeção 2028", icon: (a) => <ITrend a={a} /> },
  ]},
  { grupo: "Info", itens: [
    { id: "sobre", label: "Sobre", desc: "Metodologia e fontes", icon: (a) => <IInfo a={a} /> },
  ]},
];
const ALL_ITEMS = GROUPS.flatMap((g) => g.itens);

export default function App() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [section, setSection] = useState<SectionId>("visao");
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [gr, sr, vr] = await Promise.all([
          fetch("/data/rn-municipios.geojson"),
          fetch("/data/socioeconomico-rn.json"),
          fetch("/data/eleicao/serido-vereador-2024.json"),
        ]);
        if (!gr.ok || !sr.ok || !vr.ok) throw new Error("falha ao buscar dados");
        const geo = await gr.json();
        const s = await sr.json();
        const v = await vr.json();
        if (!alive) return;
        const socio: Socio[] = s.municipios;
        const serido: SeridoVereador = v;
        setBundle({
          geo, socio, serido,
          socioByCode: new Map(socio.map((m) => [m.codigo_ibge, m])),
          nameByCode: new Map(socio.map((m) => [m.codigo_ibge, m.nome])),
          seridoSet: new Set(serido.municipios.map((m) => m.codigo_ibge).filter(Boolean) as number[]),
        });
      } catch (e) {
        if (alive) setErro(e instanceof Error ? e.message : "erro");
      }
    })();
    return () => { alive = false; };
  }, []);

  // roteamento por hash (URL por aba + botão voltar do navegador)
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace("#", "") as SectionId;
      if (ALL_ITEMS.some((m) => m.id === h)) setSection(h);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const go = (id: SectionId) => {
    setSection(id);
    setMenuOpen(false);
    // usa o hash (cria entrada no histórico → botão voltar alterna entre abas)
    if (typeof window !== "undefined" && window.location.hash.slice(1) !== id) {
      window.location.hash = id;
    }
  };
  const current = ALL_ITEMS.find((m) => m.id === section)!;

  return (
    <div className="min-h-screen lg:grid" style={{ gridTemplateColumns: collapsed ? "76px 1fr" : "260px 1fr" }}>
      <Sidebar section={section} go={go} open={menuOpen} setOpen={setMenuOpen} collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex flex-col min-h-screen min-w-0">
        <Topbar title={current.label} desc={current.desc} onMenu={() => setMenuOpen(true)} />

        <main className="flex-1 w-full max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {erro ? (
            <Erro msg={erro} />
          ) : !bundle ? (
            <Loading />
          ) : (
            <div key={section} className="rise">
              {section === "visao" && <OverviewTab b={bundle} goTo={go} />}
              {section === "mapa" && <MapTab b={bundle} />}
              {section === "pesquisas" && <PesquisasTab />}
              {section === "vereadores" && <VereadoresTab b={bundle} />}
              {section === "analise" && <AnaliseTab b={bundle} />}
              {section === "tendencias" && <TendenciasTab b={bundle} />}
              {section === "sobre" && <SobreTab />}
            </div>
          )}
        </main>

        <footer className="border-t border-[color:var(--line)] py-5 text-center">
          <p className="text-xs text-[color:var(--muted)]">
            Desenvolvido pela <b className="text-[color:var(--navy)]">Beyonder IA</b> — 2026 · Johnattan Dias · Fontes: TSE e IBGE
          </p>
        </footer>
      </div>
    </div>
  );
}

function Sidebar({ section, go, open, setOpen, collapsed, setCollapsed }: { section: SectionId; go: (i: SectionId) => void; open: boolean; setOpen: (b: boolean) => void; collapsed: boolean; setCollapsed: (b: boolean) => void }) {
  return (
    <>
      {open && <div className="lg:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />}
      <aside className={`fixed lg:sticky top-0 z-50 lg:z-auto h-screen ${collapsed ? "w-[76px]" : "w-[260px]"} shrink-0 bg-white border-r border-[color:var(--line)] flex flex-col transition-all duration-300 ${open ? "translate-x-0 w-[260px]" : "-translate-x-full lg:translate-x-0"}`}>
        <div className={`flex items-center h-16 border-b border-[color:var(--line)] ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          <button onClick={() => go("visao")} className="flex items-center gap-2.5 min-w-0">
            <Logo />
            {!collapsed && <div className="wordmark text-[18px] leading-none truncate"><span style={{ color: "var(--navy)" }}>RN</span><span style={{ color: "var(--royal)" }}> Analytics</span></div>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex p-1.5 rounded-lg hover:bg-black/5 text-[color:var(--muted)]" aria-label="Retrair menu" title={collapsed ? "Expandir" : "Retrair"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ transform: collapsed ? "rotate(180deg)" : "none" }}><path d="M15 6l-6 6 6 6" /></svg>
          </button>
        </div>

        <nav className="flex-1 p-2.5 overflow-y-auto overflow-x-hidden">
          {GROUPS.map((g) => (
            <div key={g.grupo} className="mb-2">
              {!collapsed && <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--muted)] px-3 py-2">{g.grupo}</div>}
              {collapsed && <div className="h-px bg-[color:var(--line)] mx-2 my-2" />}
              <div className="space-y-1">
                {g.itens.map((m) => {
                  const active = section === m.id;
                  return (
                    <button key={m.id} onClick={() => go(m.id)} title={m.label}
                      className={`group w-full flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 relative ${collapsed ? "justify-center px-2" : "px-3"} ${active ? "bg-[rgba(12,82,154,0.09)]" : "hover:bg-[rgba(12,82,154,0.05)] hover:translate-x-0.5"}`}>
                      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: "var(--royal)" }} />}
                      <span className="shrink-0">{m.icon(active)}</span>
                      {!collapsed && (
                        <span className="text-left min-w-0">
                          <span className="block text-sm font-semibold leading-tight" style={{ color: active ? "var(--royal)" : "var(--ink)" }}>{m.label}</span>
                          <span className="block text-[11px] text-[color:var(--muted)] truncate">{m.desc}</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="p-3 border-t border-[color:var(--line)]">
            <div className="rounded-xl p-3 text-center text-white text-xs relative overflow-hidden" style={{ background: "linear-gradient(120deg, var(--navy), var(--royal))" }}>
              <p className="opacity-80">Desenvolvido pela</p>
              <p className="wordmark text-sm mt-0.5">Beyonder IA · 2026</p>
              <p className="opacity-80 mt-0.5">Johnattan Dias</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function Topbar({ title, desc, onMenu }: { title: string; desc: string; onMenu: () => void }) {
  return (
    <header className="glass sticky top-0 z-30 border-b border-[color:var(--line)] h-16 flex items-center px-4 sm:px-6 lg:px-8">
      <button onClick={onMenu} className="lg:hidden mr-3 p-2 -ml-2 rounded-lg hover:bg-black/5" aria-label="Menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2.2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </button>
      <div>
        <h1 className="text-lg font-extrabold text-[color:var(--navy)] leading-tight" style={{ letterSpacing: "-0.02em" }}>{title}</h1>
        <p className="text-xs text-[color:var(--muted)] -mt-0.5">{desc}</p>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="9" fill="var(--navy)" />
      <path d="M8 22V10l8 8V10" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23.5" cy="11" r="2.2" fill="var(--gold)" />
      <rect x="7" y="24.5" width="18" height="2" rx="1" fill="var(--green)" />
    </svg>
  );
}

function Loading() {
  return (
    <div className="card p-20 text-center mt-10">
      <div className="inline-block w-7 h-7 border-[3px] border-[color:var(--line)] border-t-[color:var(--royal)] rounded-full animate-spin" />
      <p className="text-[color:var(--muted)] mt-4 text-sm">Carregando dados oficiais (IBGE + TSE)…</p>
    </div>
  );
}

function Erro({ msg }: { msg: string }) {
  return (
    <div className="card p-12 text-center mt-10">
      <p className="text-[color:var(--navy)] font-bold">Não consegui carregar os dados</p>
      <p className="text-[color:var(--muted)] text-sm mt-1">{msg}</p>
      <button onClick={() => location.reload()} className="btn btn-primary text-sm mt-4">Tentar de novo</button>
    </div>
  );
}

const ic = (a: boolean) => ({ stroke: a ? "var(--royal)" : "var(--muted)", width: 20, height: 20, fill: "none", strokeWidth: 2, viewBox: "0 0 24 24" } as const);
const IGrid = ({ a }: { a: boolean }) => (<svg {...ic(a)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>);
const IMap = ({ a }: { a: boolean }) => (<svg {...ic(a)}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></svg>);
const IUsers = ({ a }: { a: boolean }) => (<svg {...ic(a)}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 6a3 3 0 0 1 0 6M21 20c0-2-1.5-3.5-3.5-4" /></svg>);
const ITrend = ({ a }: { a: boolean }) => (<svg {...ic(a)}><path d="M3 17l6-6 4 4 7-7" /><path d="M14 7h6v6" /></svg>);
const IInfo = ({ a }: { a: boolean }) => (<svg {...ic(a)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>);
const IPin = ({ a }: { a: boolean }) => (<svg {...ic(a)}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>);
const IPoll = ({ a }: { a: boolean }) => (<svg {...ic(a)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>);
