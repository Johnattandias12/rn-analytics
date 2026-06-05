"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FeatureCollection, Geometry } from "geojson";
import type { Socio, SeridoVereador } from "../lib/data";
import OverviewTab from "./tabs/OverviewTab";
import MapTab from "./tabs/MapTab";
import VereadoresTab from "./tabs/VereadoresTab";
import MapaVotacaoTab from "./tabs/MapaVotacaoTab";
import EvolucaoTab from "./tabs/EvolucaoTab";
import ConsultasTab from "./tabs/ConsultasTab";
import SobreTab from "./tabs/SobreTab";

export type Bundle = {
  geo: FeatureCollection<Geometry, { codarea: string }>;
  socio: Socio[];
  serido: SeridoVereador;
  socioByCode: Map<number, Socio>;
  seridoSet: Set<number>;
  nameByCode: Map<number, string>;
};

export type SectionId = "visao" | "mapa" | "vereadores" | "mapavotacao" | "evolucao" | "consultas" | "sobre";

type Item = { id: SectionId; label: string; desc: string; icon: (a: boolean) => React.ReactNode };
const GROUPS: { grupo: string; itens: Item[] }[] = [
  { grupo: "Estado", itens: [
    { id: "visao", label: "Visão Geral", desc: "Panorama do RN", icon: (a) => <IGrid a={a} /> },
    { id: "mapa", label: "Mapa do RN", desc: "167 municípios", icon: (a) => <IMap a={a} /> },
  ]},
  { grupo: "Currais Novos", itens: [
    { id: "mapavotacao", label: "Mapa de Votação", desc: "Redutos por seção", icon: (a) => <IPin a={a} /> },
    { id: "vereadores", label: "Vereadores", desc: "Filtros e exportação", icon: (a) => <IUsers a={a} /> },
    { id: "evolucao", label: "Evolução", desc: "Tendência 2012–2024", icon: (a) => <ITrend a={a} /> },
    { id: "consultas", label: "Consultas", desc: "Cruzar dados e insights", icon: (a) => <ISearch a={a} /> },
  ]},
  { grupo: "Info", itens: [
    { id: "sobre", label: "Sobre", desc: "Metodologia e fontes", icon: (a) => <IInfo a={a} /> },
  ]},
];
const ALL_ITEMS = GROUPS.flatMap((g) => g.itens);

export default function App() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [section, setSection] = useState<SectionId>("visao");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [geo, s, v] = await Promise.all([
        fetch("/data/rn-municipios.geojson").then((r) => r.json()),
        fetch("/data/socioeconomico-rn.json").then((r) => r.json()),
        fetch("/data/eleicao/serido-vereador-2024.json").then((r) => r.json()),
      ]);
      const socio: Socio[] = s.municipios;
      const serido: SeridoVereador = v;
      setBundle({
        geo, socio, serido,
        socioByCode: new Map(socio.map((m) => [m.codigo_ibge, m])),
        nameByCode: new Map(socio.map((m) => [m.codigo_ibge, m.nome])),
        seridoSet: new Set(serido.municipios.map((m) => m.codigo_ibge).filter(Boolean) as number[]),
      });
    })();
  }, []);

  const go = (id: SectionId) => { setSection(id); setMenuOpen(false); };
  const current = ALL_ITEMS.find((m) => m.id === section)!;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <Sidebar section={section} go={go} open={menuOpen} setOpen={setMenuOpen} />

      {/* Conteúdo */}
      <div className="flex flex-col min-h-screen min-w-0">
        <Topbar title={current.label} desc={current.desc} onMenu={() => setMenuOpen(true)} />

        <main className="flex-1 w-full max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {!bundle ? (
            <Loading />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.38, ease: [0.2, 0.7, 0.2, 1] }}>
                {section === "visao" && <OverviewTab b={bundle} goTo={go} />}
                {section === "mapa" && <MapTab b={bundle} />}
                {section === "mapavotacao" && <MapaVotacaoTab b={bundle} />}
                {section === "vereadores" && <VereadoresTab b={bundle} />}
                {section === "evolucao" && <EvolucaoTab b={bundle} />}
                {section === "consultas" && <ConsultasTab b={bundle} />}
                {section === "sobre" && <SobreTab />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        <footer className="border-t border-[color:var(--line)] py-5 text-center">
          <p className="text-xs text-[color:var(--muted)]">
            Fontes: TSE (Dados Abertos) e IBGE · dados públicos agregados · nenhum dado individual de eleitor é utilizado.
          </p>
        </footer>
      </div>
    </div>
  );
}

function Sidebar({ section, go, open, setOpen }: { section: SectionId; go: (i: SectionId) => void; open: boolean; setOpen: (b: boolean) => void }) {
  return (
    <>
      {open && <div className="lg:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />}
      <aside className={`fixed lg:sticky top-0 z-50 lg:z-auto h-screen w-[260px] shrink-0 bg-white border-r border-[color:var(--line)] flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <button onClick={() => go("visao")} className="flex items-center gap-2.5 px-5 h-16 border-b border-[color:var(--line)]">
          <Logo />
          <div className="wordmark text-[19px] leading-none"><span style={{ color: "var(--navy)" }}>RN</span><span style={{ color: "var(--royal)" }}> Analytics</span></div>
        </button>

        <nav className="flex-1 p-3 overflow-y-auto">
          {GROUPS.map((g) => (
            <div key={g.grupo} className="mb-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--muted)] px-3 py-2">{g.grupo}</div>
              <div className="space-y-1">
                {g.itens.map((m) => {
                  const active = section === m.id;
                  return (
                    <button key={m.id} onClick={() => go(m.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition relative"
                      style={{ background: active ? "rgba(12,82,154,0.08)" : "transparent" }}>
                      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: "var(--royal)" }} />}
                      <span className="shrink-0">{m.icon(active)}</span>
                      <span className="text-left min-w-0">
                        <span className="block text-sm font-semibold leading-tight" style={{ color: active ? "var(--royal)" : "var(--ink)" }}>{m.label}</span>
                        <span className="block text-[11px] text-[color:var(--muted)] truncate">{m.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-[color:var(--line)]">
          <div className="rounded-xl p-3 text-center text-white text-xs relative overflow-hidden" style={{ background: "linear-gradient(120deg, var(--navy), var(--royal))" }}>
            <p className="opacity-80">Desenvolvido pela</p>
            <p className="wordmark text-sm mt-0.5">Beyonder IA · 2026</p>
            <p className="opacity-80 mt-0.5">Johnattan Dias</p>
          </div>
        </div>
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
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden>
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

// ---- ícones do menu ----
const ic = (a: boolean) => ({ stroke: a ? "var(--royal)" : "var(--muted)", width: 20, height: 20, fill: "none", strokeWidth: 2, viewBox: "0 0 24 24" } as const);
const IGrid = ({ a }: { a: boolean }) => (<svg {...ic(a)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>);
const IMap = ({ a }: { a: boolean }) => (<svg {...ic(a)}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></svg>);
const IUsers = ({ a }: { a: boolean }) => (<svg {...ic(a)}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 6a3 3 0 0 1 0 6M21 20c0-2-1.5-3.5-3.5-4" /></svg>);
const ITrend = ({ a }: { a: boolean }) => (<svg {...ic(a)}><path d="M3 17l6-6 4 4 7-7" /><path d="M14 7h6v6" /></svg>);
const IInfo = ({ a }: { a: boolean }) => (<svg {...ic(a)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>);
const IPin = ({ a }: { a: boolean }) => (<svg {...ic(a)}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>);
const ISearch = ({ a }: { a: boolean }) => (<svg {...ic(a)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>);
