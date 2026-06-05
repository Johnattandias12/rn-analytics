// Fase 2/3 — Processa votação seção 2024 RN:
//  (a) de-para TSE↔IBGE dos municípios
//  (b) agregado de VEREADORES do Seridó (candidatos + locais de votação)
//  (c) granular por seção para Currais Novos (núcleo)
import { writeFile, readFile } from "node:fs/promises";
import { parseCsvTse, RAW, PROC, resolve } from "./lib-tse.mjs";

// normalização para casar nomes: sem acento, MAIÚSCULA, só letras/números (remove espaço, apóstrofo, hífen, ponto)
const norm = (s) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// aliases TSE→IBGE (cidades renomeadas)
const ALIAS = new Map([["BOASAUDE", "JANUARIOCICCO"]]);
const matchKey = (s) => { const k = norm(s); return ALIAS.get(k) || k; };

// Seridó ampliado (Território de Desenvolvimento): microrregiões + Serra de Santana
const SERIDO_EXTRA = new Set(
  ["BODÓ", "CERRO CORÁ", "FLORÂNIA", "LAGOA NOVA", "SÃO VICENTE", "TENENTE LAURENTINO CRUZ"].map(norm)
);

async function main() {
  const accessedAt = new Date().toISOString().slice(0, 10);
  const ibge = JSON.parse(await readFile(resolve(PROC, "municipios-rn.json"), "utf8"));
  const ibgeByNorm = new Map(ibge.municipios.map((m) => [norm(m.nome), m]));
  const seridoMicro = new Set(
    ibge.municipios.filter((m) => /Seridó/.test(m.microrregiao || "")).map((m) => norm(m.nome))
  );
  const isSerido = (nmNorm) => seridoMicro.has(nmNorm) || SERIDO_EXTRA.has(nmNorm);

  const csv = resolve(RAW, "votacao_secao_2024_RN", "votacao_secao_2024_RN.csv");

  // acumuladores
  const depara = new Map(); // cd_tse -> {cd_tse, nm_tse}
  const cand = new Map();   // `${cd}|${sq}` -> {cd, nome_mun, sq, numero, nome, partido_num, votos}  (só nominal)
  const legenda = new Map(); // `${cd}|${num}` -> {cd, partido_num, nome, votos}
  const brancoNulo = new Map(); // cd -> {brancos, nulos}
  const locais = new Map(); // `${cd}|${nr}` -> {cd, nr, nome, endereco, zona, votos}
  const validosVer = new Map(); // cd -> votos nominais de vereador
  const cnSecoes = new Map(); // Currais Novos: `${zona}|${secao}|${sq}` -> votos (granular)
  let CN_CD = null;

  console.log("→ Processando 483 mil linhas (votação seção 2024 RN)…");
  await parseCsvTse(csv, (r) => {
    const cd = r.CD_MUNICIPIO;
    if (!cd || !r.NM_MUNICIPIO) return;
    if (!depara.has(cd)) depara.set(cd, { cd_tse: cd, nm_tse: r.NM_MUNICIPIO });
    if (r.DS_CARGO !== "Vereador") return;
    const nmNorm = norm(r.NM_MUNICIPIO);
    if (!isSerido(nmNorm)) return;

    const votos = Number(r.QT_VOTOS) || 0;
    const numero = r.NR_VOTAVEL;
    const sq = r.SQ_CANDIDATO;
    // classificação por SQ: -1 = branco/nulo · -3 = legenda partidária · positivo = candidato nominal
    if (sq === "-1") {
      const bn = brancoNulo.get(cd) || { brancos: 0, nulos: 0 };
      if (numero === "95") bn.brancos += votos; else bn.nulos += votos;
      brancoNulo.set(cd, bn);
    } else if (sq === "-3") {
      const lk = `${cd}|${numero}`;
      if (!legenda.has(lk)) legenda.set(lk, { cd, partido_num: numero, nome: r.NM_VOTAVEL, votos: 0 });
      legenda.get(lk).votos += votos;
    } else if (sq && sq !== "") {
      const ck = `${cd}|${sq}`;
      if (!cand.has(ck)) cand.set(ck, {
        cd, nome_mun: r.NM_MUNICIPIO, sq, numero,
        nome: r.NM_VOTAVEL, partido_num: numero.slice(0, 2), votos: 0,
      });
      cand.get(ck).votos += votos;
      validosVer.set(cd, (validosVer.get(cd) || 0) + votos);
    }
    // local de votação (soma todos os votos de vereador no local)
    const lk = `${cd}|${r.NR_LOCAL_VOTACAO}`;
    if (!locais.has(lk)) locais.set(lk, {
      cd, nr: r.NR_LOCAL_VOTACAO, nome: r.NM_LOCAL_VOTACAO,
      endereco: r.DS_LOCAL_VOTACAO_ENDERECO, zona: r.NR_ZONA, votos: 0,
    });
    locais.get(lk).votos += votos;

    // granular Currais Novos
    if (nmNorm === "CURRAISNOVOS") {
      CN_CD = cd;
      if (sq && sq !== "-1" && sq !== "-3") {
        const sk = `${r.NR_ZONA}|${r.NR_SECAO}|${sq}`;
        cnSecoes.set(sk, (cnSecoes.get(sk) || 0) + votos);
      }
    }
  });

  // (a) de-para com casamento IBGE
  const deparaArr = [...depara.values()].map((d) => {
    const m = ibgeByNorm.get(matchKey(d.nm_tse));
    return {
      cd_tse: Number(d.cd_tse), nm_tse: d.nm_tse,
      codigo_ibge: m?.codigo_ibge ?? null, nome_ibge: m?.nome ?? null,
      microrregiao: m?.microrregiao ?? null,
    };
  }).sort((a, b) => a.nm_tse.localeCompare(b.nm_tse, "pt-BR"));
  const semMatch = deparaArr.filter((d) => d.codigo_ibge == null);
  await save("depara-tse-ibge.json", {
    meta: { source: "TSE votacao_secao 2024 × IBGE Localidades", accessedAt, total: deparaArr.length, sem_match: semMatch.length },
    municipios: deparaArr,
  });
  console.log(`  · de-para: ${deparaArr.length} municípios TSE; sem match IBGE: ${semMatch.length}`);
  if (semMatch.length) console.log("    nomes sem match:", semMatch.map((d) => d.nm_tse).join(", "));

  // (b) agregado vereadores Seridó
  const porMun = {};
  for (const c of cand.values()) {
    const key = c.cd;
    porMun[key] ??= { cd_tse: Number(c.cd), nome: c.nome_mun, total_votos_nominais: validosVer.get(c.cd) || 0, candidatos: [] };
    porMun[key].candidatos.push({ sq: c.sq, numero: c.numero, nome: c.nome, partido_num: c.partido_num, votos: c.votos });
  }
  // legenda por partido e branco/nulo, agrupados por município
  const legendaPorMun = {};
  for (const l of legenda.values()) (legendaPorMun[l.cd] ??= []).push({ partido_num: l.partido_num, nome: l.nome, votos: l.votos });
  for (const m of Object.values(porMun)) {
    m.candidatos.sort((a, b) => b.votos - a.votos);
    m.candidatos.forEach((c, i) => (c.rank = i + 1));
    const ibm = ibgeByNorm.get(matchKey(m.nome));
    m.codigo_ibge = ibm?.codigo_ibge ?? null;
    m.microrregiao = ibm?.microrregiao ?? null;
    m.qtd_candidatos = m.candidatos.length;
    const bn = brancoNulo.get(String(m.cd_tse)) || brancoNulo.get(m.cd_tse) || { brancos: 0, nulos: 0 };
    m.brancos = bn.brancos; m.nulos = bn.nulos;
    m.legenda = (legendaPorMun[m.cd_tse] || legendaPorMun[String(m.cd_tse)] || []).sort((a, b) => b.votos - a.votos);
    m.votos_legenda_total = m.legenda.reduce((a, b) => a + b.votos, 0);
  }
  const locaisArr = [...locais.values()].sort((a, b) => b.votos - a.votos);
  await save("eleicao/serido-vereador-2024.json", {
    meta: { source: "TSE votacao_secao 2024 RN", ano: 2024, cargo: "Vereador", accessedAt,
      nota: "Votos nominais por candidato. Branco/nulo não somados aqui." },
    municipios: Object.values(porMun).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    locais_votacao: locaisArr,
  });
  const totCand = [...cand.values()].length;
  const totVotos = [...validosVer.values()].reduce((a, b) => a + b, 0);
  console.log(`  · Seridó vereador 2024: ${Object.keys(porMun).length} municípios, ${totCand} candidatos, ${totVotos.toLocaleString("pt-BR")} votos nominais, ${locaisArr.length} locais.`);

  // (c) granular Currais Novos por seção
  const cnRows = [...cnSecoes.entries()].map(([k, v]) => {
    const [zona, secao, sq] = k.split("|");
    return { zona: Number(zona), secao: Number(secao), sq, votos: v };
  });
  await save("eleicao/currais-novos-vereador-2024-secao.json", {
    meta: { source: "TSE votacao_secao 2024 RN", municipio: "Currais Novos", cd_tse: Number(CN_CD), cargo: "Vereador", ano: 2024, accessedAt, registros: cnRows.length },
    votos_por_secao: cnRows,
  });
  console.log(`  · Currais Novos granular: ${cnRows.length} registros (zona×seção×candidato).`);

  console.log("\nConcluído 2024. Próximo: anos 2012/16/20 (vereador) e 2014/18/22 (estadual/federal).");
}

async function save(rel, data) {
  const path = resolve(PROC, rel);
  const txt = JSON.stringify(data, null, 2);
  const { mkdir } = await import("node:fs/promises");
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, txt, "utf8");
  console.log(`  ✓ ${rel} (${(txt.length / 1024).toFixed(1)} KB)`);
}

main().catch((e) => { console.error("ERRO:", e.stack); process.exit(1); });
