"use client";

import { useState } from "react";
import type { Bundle } from "../App";
import MapaVotacaoTab from "./MapaVotacaoTab";
import ConsultasTab from "./ConsultasTab";

// Consolida as duas ferramentas de análise de Currais Novos num só lugar.
export default function AnaliseTab({ b }: { b: Bundle }) {
  const [view, setView] = useState<"redutos" | "consultas">("redutos");
  return (
    <div>
      <div className="segment mb-5 flex-wrap">
        <button data-active={view === "redutos"} onClick={() => setView("redutos")}>
          Mapa de redutos
        </button>
        <button data-active={view === "consultas"} onClick={() => setView("consultas")}>
          Consultas e insights
        </button>
      </div>
      {view === "redutos" ? <MapaVotacaoTab b={b} /> : <ConsultasTab b={b} />}
    </div>
  );
}
