// Currais Novos detalhado: vereador + prefeito por seção/local com geolocalização.
// Anos: 2016, 2020, 2024. Gera eleicao/cn/currais-novos-<ano>.json
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseCsvTse, RAW, PROC, resolve } from "./lib-tse.mjs";

const ANOS = [2016, 2020, 2024];
const CN = "CURRAIS NOVOS";

async function save(rel, data) {
  const path = resolve(PROC, rel);
  await mkdir(resolve(path, ".."), { recursive: true });
  const txt = JSON.stringify(data, null, 2);
  await writeFile(path, txt, "utf8");
  console.log(`  ✓ ${rel} (${(txt.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  // 1) coordenadas + eleitores por seção (dataset de locais 2024)
  console.log("→ lendo locais de votação (coordenadas)…");
  const coordsByLocal = new Map(); // `${zona}|${nrLocal}` -> {nome, endereco, bairro, lat, long}
  const eleitoresBySecao = new Map(); // `${zona}|${secao}` -> eleitores
  await parseCsvTse(resolve(RAW, "eleitorado_local_votacao_2024", "eleitorado_local_votacao_2024.csv"), (r) => {
    if (r.SG_UF !== "RN" || (r.NM_MUNICIPIO || "").toUpperCase() !== CN) return;
    const zona = r.NR_ZONA, local = r.NR_LOCAL_VOTACAO, secao = r.NR_SECAO;
    const lk = `${zona}|${local}`;
    if (!coordsByLocal.has(lk)) {
      const lat = Number(r.NR_LATITUDE), long = Number(r.NR_LONGITUDE);
      coordsByLocal.set(lk, {
        nr: local, nome: r.NM_LOCAL_VOTACAO, endereco: r.DS_ENDERECO, bairro: r.NM_BAIRRO || "",
        lat: Number.isFinite(lat) && lat !== -1 ? lat : null,
        long: Number.isFinite(long) && long !== -1 ? long : null,
      });
    }
    eleitoresBySecao.set(`${zona}|${secao}`, Number(r.QT_ELEITOR_SECAO) || 0);
  });
  console.log(`  · ${coordsByLocal.size} locais, ${eleitoresBySecao.size} seções com coordenada/eleitores.`);

  for (const ano of ANOS) {
    const csv = resolve(RAW, `votacao_secao_${ano}_RN`, `votacao_secao_${ano}_RN.csv`);
    const cargos = { Vereador: novoCargo(), Prefeito: novoCargo() };
    const secaoLocal = new Map(); // `${zona}|${secao}` -> nrLocal
    let cd = null;

    await parseCsvTse(csv, (r) => {
      if ((r.NM_MUNICIPIO || "").toUpperCase() !== CN) return;
      cd = r.CD_MUNICIPIO;
      const cargoNome = /vereador/i.test(r.DS_CARGO) ? "Vereador" : /prefeito/i.test(r.DS_CARGO) ? "Prefeito" : null;
      if (!cargoNome) return;
      const C = cargos[cargoNome];
      const zona = r.NR_ZONA, secao = r.NR_SECAO, local = r.NR_LOCAL_VOTACAO;
      const votos = Number(r.QT_VOTOS) || 0;
      const sq = r.SQ_CANDIDATO, numero = String(r.NR_VOTAVEL || "");
      secaoLocal.set(`${zona}|${secao}`, local);

      if (sq === "-1") { if (numero === "95") C.brancos += votos; else C.nulos += votos; return; }
      if (sq === "-3") { C.legenda += votos; return; }
      if (!sq) return;
      // candidato nominal
      let c = C.cand.get(sq);
      if (!c) { c = { sq, numero, nome: r.NM_VOTAVEL, partido_num: numero.slice(0, 2), votos: 0, por_local: {} }; C.cand.set(sq, c); }
      c.votos += votos;
      c.por_local[local] = (c.por_local[local] || 0) + votos;
      C.total += votos;
      C.localTotal.set(local, (C.localTotal.get(local) || 0) + votos);
      // eleitores do local (uma vez por seção)
    });

    // locais presentes (com coordenada) + agregados
    const locaisAno = new Map(); // nrLocal -> {..., eleitores, secoes:Set}
    for (const [zs, local] of secaoLocal) {
      const [zona, secao] = zs.split("|");
      const lk = `${zona}|${local}`;
      const co = coordsByLocal.get(lk);
      let L = locaisAno.get(local);
      if (!L) { L = { nr: local, nome: co?.nome || "", endereco: co?.endereco || "", bairro: co?.bairro || "", lat: co?.lat ?? null, long: co?.long ?? null, eleitores: 0, secoes: new Set() }; locaisAno.set(local, L); }
      L.secoes.add(secao);
      L.eleitores += eleitoresBySecao.get(zs) || 0;
    }
    const locais = [...locaisAno.values()].map((L) => ({
      nr: L.nr, nome: L.nome, endereco: L.endereco, bairro: L.bairro, lat: L.lat, long: L.long,
      eleitores: L.eleitores, n_secoes: L.secoes.size,
      vereador_total: cargos.Vereador.localTotal.get(L.nr) || 0,
      prefeito_total: cargos.Prefeito.localTotal.get(L.nr) || 0,
    })).sort((a, b) => b.eleitores - a.eleitores);

    const build = (C) => {
      const cands = [...C.cand.values()].sort((a, b) => b.votos - a.votos);
      cands.forEach((c, i) => (c.rank = i + 1));
      return { total_nominais: C.total, brancos: C.brancos, nulos: C.nulos, legenda: C.legenda, candidatos: cands };
    };

    await save(`eleicao/cn/currais-novos-${ano}.json`, {
      meta: { source: "TSE votacao_secao + eleitorado_local_votacao", municipio: CN, cd_tse: Number(cd), ano,
        nota: "Coordenadas e eleitores de referência 2024. Votos por local de votação.", accessedAt: new Date().toISOString().slice(0, 10) },
      locais,
      vereador: build(cargos.Vereador),
      prefeito: build(cargos.Prefeito),
    });

    const comGeo = locais.filter((l) => l.lat != null).length;
    console.log(`  ${ano}: ${locais.length} locais (${comGeo} c/ coord), vereador ${cargos.Vereador.cand.size} cand / ${cargos.Vereador.total} votos, prefeito ${cargos.Prefeito.cand.size} cand / ${cargos.Prefeito.total} votos.`);
  }
}

function novoCargo() { return { cand: new Map(), total: 0, brancos: 0, nulos: 0, legenda: 0, localTotal: new Map() }; }

main().catch((e) => { console.error("ERRO:", e.stack); process.exit(1); });
