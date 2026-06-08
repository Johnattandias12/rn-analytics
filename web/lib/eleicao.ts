// Apuração de quem foi eleito.
//
// Prefeito: sistema majoritário. Em municípios com menos de 200 mil eleitores
// não há 2º turno, então o mais votado é o eleito (fato verificável).
//
// Vereador: sistema proporcional. NÃO dá para deduzir só pela ordem de votos.
// Aqui projetamos o resultado pelo método do quociente eleitoral a partir dos
// votos oficiais do TSE. O número de cadeiras vem da fórmula constitucional
// (CF art. 29, IX, com a EC 58/2009), que é função determinística da população
// (IBGE). É uma PROJEÇÃO transparente — a diplomação oficial é sempre do TSE.

export type CandApur = { sq: string; nome: string; partido_num: string; votos: number };
export type LegendaApur = { partido_num: string; votos: number };

export type Situacao = {
  eleito: boolean;
  rotulo: "Eleito" | "Não eleito" | "Suplente";
  motivo: string;
  oficial: boolean; // true = fato verificável (prefeito); false = projeção (vereador)
};

// Número de cadeiras na Câmara Municipal por faixa de população (CF art. 29, IX).
export function vagasCamara(pop: number | null | undefined): number | null {
  if (pop == null) return null;
  if (pop <= 15000) return 9;
  if (pop <= 30000) return 11;
  if (pop <= 50000) return 13;
  if (pop <= 80000) return 15;
  if (pop <= 120000) return 17;
  if (pop <= 160000) return 19;
  if (pop <= 300000) return 21;
  if (pop <= 450000) return 23;
  if (pop <= 600000) return 25;
  return 27;
}

// Prefeito: eleito = mais votado (turno único nos municípios do RN, todos < 200 mil eleitores).
export function apurarPrefeito(cands: CandApur[]): Map<string, Situacao> {
  const ordenados = cands.slice().sort((a, b) => b.votos - a.votos);
  const m = new Map<string, Situacao>();
  ordenados.forEach((c, i) => {
    m.set(
      c.sq,
      i === 0
        ? { eleito: true, rotulo: "Eleito", motivo: "Mais votado no turno único (município com menos de 200 mil eleitores).", oficial: true }
        : { eleito: false, rotulo: "Não eleito", motivo: `Ficou em ${i + 1}º lugar na disputa majoritária.`, oficial: true }
    );
  });
  return m;
}

// Vereador: projeção pelo quociente eleitoral.
export function apurarVereador(
  cands: CandApur[],
  legenda: LegendaApur[],
  vagas: number | null
): { situacoes: Map<string, Situacao>; qe: number; vagas: number } {
  const situacoes = new Map<string, Situacao>();
  const totalNominais = cands.reduce((a, c) => a + c.votos, 0);
  const totalLegenda = legenda.reduce((a, l) => a + l.votos, 0);
  const validos = totalNominais + totalLegenda;
  const V = vagas ?? 9;
  const qe = Math.max(1, Math.round(validos / V)); // fração >= 0,5 sobe

  // agrupa por partido
  type P = { num: string; nominais: number; legenda: number; cands: CandApur[] };
  const partidos = new Map<string, P>();
  const getP = (num: string) => {
    let p = partidos.get(num);
    if (!p) { p = { num, nominais: 0, legenda: 0, cands: [] }; partidos.set(num, p); }
    return p;
  };
  for (const c of cands) { const p = getP(c.partido_num); p.nominais += c.votos; p.cands.push(c); }
  for (const l of legenda) getP(l.partido_num).legenda += l.votos;

  const totalDe = (p: P) => p.nominais + p.legenda;
  // só concorre às vagas o partido que atingiu o quociente eleitoral
  const elegiveis = [...partidos.values()].filter((p) => totalDe(p) >= qe);
  const seats = new Map<string, number>();
  for (const p of elegiveis) seats.set(p.num, Math.floor(totalDe(p) / qe));
  let usadas = [...seats.values()].reduce((a, b) => a + b, 0);

  // sobras: maiores médias entre os partidos elegíveis
  let guard = 0;
  while (usadas < V && elegiveis.length && guard++ < 1000) {
    let best: P | null = null, bestAvg = -1;
    for (const p of elegiveis) {
      const avg = totalDe(p) / ((seats.get(p.num) ?? 0) + 1);
      if (avg > bestAvg) { bestAvg = avg; best = p; }
    }
    if (!best) break;
    seats.set(best.num, (seats.get(best.num) ?? 0) + 1);
    usadas++;
  }

  const limiteIndividual = 0.1 * qe; // candidato precisa de >= 10% do QE
  // dentro de cada partido: top candidatos que atingem 10% do QE ocupam as vagas
  for (const p of partidos.values()) {
    const nseats = seats.get(p.num) ?? 0;
    const ordenados = p.cands.slice().sort((a, b) => b.votos - a.votos);
    let dadas = 0;
    const atingiuQE = totalDe(p) >= qe;
    ordenados.forEach((c) => {
      const atinge10 = c.votos >= limiteIndividual;
      if (dadas < nseats && atinge10) {
        dadas++;
        situacoes.set(c.sq, { eleito: true, rotulo: "Eleito", motivo: "Eleito pela votação do partido (quociente eleitoral + 10% do QE individual).", oficial: false });
      } else if (!atingiuQE) {
        situacoes.set(c.sq, { eleito: false, rotulo: "Não eleito", motivo: "Partido não atingiu o quociente eleitoral.", oficial: false });
      } else if (!atinge10) {
        situacoes.set(c.sq, { eleito: false, rotulo: "Não eleito", motivo: "Não atingiu 10% do quociente eleitoral.", oficial: false });
      } else {
        situacoes.set(c.sq, { eleito: false, rotulo: "Suplente", motivo: "Partido elegeu menos vagas do que candidatos com votação suficiente (suplência).", oficial: false });
      }
    });
  }

  return { situacoes, qe, vagas: V };
}
