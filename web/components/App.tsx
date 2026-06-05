"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FeatureCollection, Geometry } from "geojson";
import type { Socio, SeridoVereador } from "../lib/data";
import OverviewTab from "./tabs/OverviewTab";
import MapTab from "./tabs/MapTab";
import VereadoresTab from "./tabs/VereadoresTab";
import SobreTab from "./tabs/SobreTab";

export type Bundle = {
  geo: FeatureCollection<Geometry, { codarea: string }>;
  socio: Socio[];
  serido: SeridoVereador;
  socioByCode: Map<number, Socio>;
  seridoSet: Set<number>;
  nameByCode: Map<number, string>;
};

const TABS = [
  { id: "visao", label: "Visão Geral" },
  { id: "mapa", label: "Mapa do RN" },
  { id: "vereadores", label: "Vereadores · Currais Novos" },
  { id: "sobre", label: "Sobre" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [tab, setTab] = useState<TabId>("visao");

  useEffect(() => {
    (async () => {
      const [geo, s, v] = await Promise.all([
        fetch("/data/rn-municipios.geojson").then((r) => r.json()),
        fetch("/data/socioeconomico-rn.json").then((r) => r.json()),
        fetch("/data/eleicao/serido-vereador-2024.json").then((r) => r.json()),
      ]);
      const socio: Socio[] = s.municipios;
      const serido: SeridoVereador = v;
      const socioByCode = new Map(socio.map((m) => [m.codigo_ibge, m]));
      const nameByCode = new Map(socio.map((m) => [m.codigo_ibge, m.nome]));
      const seridoSet = new Set(serido.municipios.map((m) => m.codigo_ibge).filter(Boolean) as number[]);
      setBundle({ geo, socio, serido, socioByCode, seridoSet, nameByCode });
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav tab={tab} setTab={setTab} />

      <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 pt-6 pb-24">
        {!bundle ? (
          <Loading />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
            >
              {tab === "visao" && <OverviewTab b={bundle} goTo={setTab} />}
              {tab === "mapa" && <MapTab b={bundle} />}
              {tab === "vereadores" && <VereadoresTab b={bundle} />}
              {tab === "sobre" && <SobreTab />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <Footer />
    </div>
  );
}

function Nav({ tab, setTab }: { tab: TabId; setTab: (t: TabId) => void }) {
  return (
    <header className="glass sticky top-0 z-40 border-b border-[color:var(--line)]">
      <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <button onClick={() => setTab("visao")} className="flex items-center gap-2.5 shrink-0">
          <Logo />
          <div className="wordmark text-xl leading-none">
            <span style={{ color: "var(--navy)" }}>RN</span>
            <span style={{ color: "var(--royal)" }}> Analytics</span>
          </div>
        </button>

        <nav className="hidden md:flex segment">
          {TABS.map((t) => (
            <button key={t.id} data-active={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        <select
          value={tab}
          onChange={(e) => setTab(e.target.value as TabId)}
          className="md:hidden border border-[color:var(--line)] rounded-xl px-3 py-2 text-sm font-semibold text-[color:var(--navy)] bg-white"
        >
          {TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
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

function Footer() {
  return (
    <footer className="border-t border-[color:var(--line)] bg-white/60">
      <div className="w-full max-w-[1240px] mx-auto px-6 py-8 text-center">
        <p className="text-sm text-[color:var(--ink-2)] font-medium">
          Desenvolvido pela <span className="font-bold text-[color:var(--navy)]">Beyonder IA</span> — 2026 · Johnattan Dias
        </p>
        <p className="text-xs text-[color:var(--muted)] mt-1.5 max-w-2xl mx-auto">
          Fontes: TSE (Dados Abertos — votação por seção) e IBGE (Censo 2022, PIB Municípios, Malhas). Dados públicos agregados; nenhum dado individual de eleitor é utilizado.
        </p>
      </div>
    </footer>
  );
}
