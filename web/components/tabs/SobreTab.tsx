"use client";

import { Card, Reveal, SectionTitle } from "../ui";

export default function SobreTab() {
  return (
    <div className="max-w-3xl">
      <SectionTitle kicker="Metodologia" title="Sobre o RN Analytics" desc="Uma plataforma de inteligência eleitoral e socioeconômica construída sobre dados públicos oficiais." />

      <div className="grid sm:grid-cols-2 gap-4">
        <Reveal>
          <Card className="p-5 h-full">
            <h3 className="font-bold text-[color:var(--navy)] mb-2">Fontes de dados</h3>
            <ul className="text-sm text-[color:var(--ink-2)] space-y-1.5">
              <li>• <b>TSE</b> (Dados Abertos): votação por seção, candidatos e eleitorado, de 2012 a 2024.</li>
              <li>• <b>TSE / consulta_cand</b>: situação oficial de cada candidato (eleito, suplente, não eleito) pelo campo DS_SIT_TOT_TURNO.</li>
              <li>• <b>IBGE</b>: Censo 2022, PIB dos municípios e malhas territoriais.</li>
            </ul>
          </Card>
        </Reveal>
        <Reveal delay={0.05}>
          <Card className="p-5 h-full">
            <h3 className="font-bold text-[color:var(--navy)] mb-2">Cobertura</h3>
            <ul className="text-sm text-[color:var(--ink-2)] space-y-1.5">
              <li>• 167 municípios do Rio Grande do Norte.</li>
              <li>• Recorte aprofundado: 23 municípios do Seridó.</li>
              <li>• Núcleo granular: Currais Novos, voto por seção.</li>
            </ul>
          </Card>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <Card className="p-5 mt-4">
          <h3 className="font-bold text-[color:var(--navy)] mb-2">Integridade e ética</h3>
          <p className="text-sm text-[color:var(--ink-2)] leading-relaxed">
            Todos os números vêm de fontes oficiais e são rastreáveis (fonte e ano registrados). Valores ausentes
            permanecem em branco, nunca são estimados sem indicação. O TSE divulga apenas votos <b>agregados por
            seção</b>; nenhum dado individual de eleitor é utilizado. A plataforma analisa o comportamento de
            territórios, não de pessoas.
          </p>
        </Card>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="mt-6 rounded-[20px] p-6 text-center text-white relative overflow-hidden" style={{ background: "linear-gradient(120deg, var(--navy), var(--royal))" }}>
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full" style={{ background: "var(--gold)", opacity: 0.2, filter: "blur(30px)" }} />
          <p className="text-sm opacity-80">Desenvolvido pela</p>
          <p className="text-2xl wordmark mt-1">Beyonder IA · 2026</p>
          <p className="text-sm opacity-80 mt-1">Johnattan Dias</p>
        </div>
      </Reveal>
    </div>
  );
}
