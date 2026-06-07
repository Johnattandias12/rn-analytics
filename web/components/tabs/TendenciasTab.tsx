"use client";

import { useState } from "react";
import type { Bundle } from "../App";
import EvolucaoTab from "./EvolucaoTab";
import PredictionTab from "./PredictionTab";

// Consolida o histórico (2012–2024) e a projeção (2028) numa só seção.
export default function TendenciasTab({ b }: { b: Bundle }) {
  const [view, setView] = useState<"evolucao" | "projecao">("evolucao");
  return (
    <div>
      <div className="segment mb-5 flex-wrap">
        <button data-active={view === "evolucao"} onClick={() => setView("evolucao")}>
          Evolução 2012–2024
        </button>
        <button data-active={view === "projecao"} onClick={() => setView("projecao")}>
          Projeção 2028 + cenários
        </button>
      </div>
      {view === "evolucao" ? <EvolucaoTab b={b} /> : <PredictionTab b={b} />}
    </div>
  );
}
