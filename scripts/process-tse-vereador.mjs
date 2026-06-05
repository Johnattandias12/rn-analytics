// Processa votação seção de um ANO municipal (vereador) para o Seridó.
// Uso: node scripts/process-tse-vereador.mjs <ano>   (ex.: 2012, 2016, 2020, 2024)
// Gera: eleicao/serido-vereador-<ano>.json + eleicao/currais-novos-vereador-<ano>-secao.json
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { download, unzip, parseCsvTse, RAW, PROC, resolve } from "./lib-tse.mjs";

const YEAR = Number(process.argv[2]);
if (!YEAR) { console.error("Informe o ano: node scripts/process-tse-vereador.mjs 2020"); process.exit(1); }

const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const ALIAS = new Map([["BOASAUDE", "JANUARIOCICCO"]]);
const matchKey = (s) => { const k = norm(s); return ALIAS.get(k) || k; };
const SERIDO_EXTRA = new Set(["BODÓ", "CERRO CORÁ", "FLORÂNIA", "LAGOA NOVA", "SÃO VICENTE", "TENENTE LAURENTINO CRUZ"].map(norm));

async function save(rel, data) {
  const path = resolve(PROC, rel);
  const txt = JSON.stringify(data, null, 2);
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, txt, "utf8");
  console.log(`  ✓ ${rel} (${(txt.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  const accessedAt = new Date().toISOString().slice(0, 10);
  const ibge = JSON.parse(await readFile(resolve(PROC, "municipios-rn.json"), "utf8"));
  const ibgeByNorm = new Map(ibge.municipios.map((m) => [norm(m.nome), m]));
  const seridoMicro = new Set(ibge.municipios.filter((m) => /Seridó/.test(m.microrregiao || "")).map((m) => norm(m.nome)));
  const isSerido = (nm) => seridoMicro.has(nm) || SERIDO_EXTRA.has(nm);

  const url = `https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_${YEAR}_RN.zip`;
  const zip = resolve(RAW, `votacao_secao_${YEAR}_RN.zip`);
  const out = resolve(RAW, `votacao_secao_${YEAR}_RN`);
  console.log(`→ ${YEAR}: download…`); await download(url, zip);
  console.log("→ extraindo…"); await unzip(zip, out);
  const csv = resolve(out, `votacao_secao_${YEAR}_RN.csv`);

  const cand = new Map(), legenda = new Map(), brancoNulo = new Map(), locais = new Map(), validos = new Map();
  const cnSecoes = new Map();
  let CN_CD = null, colCargo = "DS_CARGO", cargosVistos = new Set();

  console.log("→ processando…");
  await parseCsvTse(csv, (r) => {
    // compat: alguns anos antigos usam DESCRICAO_CARGO / nomes variados
    const cargo = r.DS_CARGO ?? r.DESCRICAO_CARGO ?? r.CARGO ?? "";
    if (cargosVistos.size < 30) cargosVistos.add(cargo);
    if (!/vereador/i.test(cargo)) return;

    const cd = r.CD_MUNICIPIO ?? r.CODIGO_MUNICIPIO;
    const nm = r.NM_MUNICIPIO ?? r.NOME_MUNICIPIO ?? "";
    if (!cd || !nm) return;
    const nmNorm = norm(nm);
    if (!isSerido(nmNorm)) return;

    const votos = Number(r.QT_VOTOS ?? r.QTDE_VOTOS ?? 0) || 0;
    const numero = r.NR_VOTAVEL ?? r.NUM_VOTAVEL ?? "";
    const sq = r.SQ_CANDIDATO ?? r.SEQUENCIAL_CANDIDATO ?? "";
    const nomeVot = r.NM_VOTAVEL ?? r.NOME_VOTAVEL ?? "";
    const zona = r.NR_ZONA ?? r.NUM_ZONA, secao = r.NR_SECAO ?? r.NUM_SECAO;

    // classificação robusta por tipo (anos antigos não têm SQ_CANDIDATO → usa o número)
    const numStr = String(numero);
    let kind; // 'branco' | 'nulo' | 'legenda' | 'nominal'
    if (numStr === "95" || /^(VOTO )?BRANCO$/i.test(nomeVot)) kind = "branco";
    else if (numStr === "96" || numStr === "97" || /NULO/i.test(nomeVot)) kind = "nulo";
    else if (sq === "-1") kind = "nulo";
    else if (sq === "-3" || (numStr.length > 0 && numStr.length <= 2)) kind = "legenda";
    else kind = "nominal";

    if (kind === "branco" || kind === "nulo") {
      const bn = brancoNulo.get(cd) || { brancos: 0, nulos: 0 };
      if (kind === "branco") bn.brancos += votos; else bn.nulos += votos;
      brancoNulo.set(cd, bn);
    } else if (kind === "legenda") {
      const lk = `${cd}|${numStr}`;
      if (!legenda.has(lk)) legenda.set(lk, { cd, partido_num: numStr, nome: nomeVot, votos: 0 });
      legenda.get(lk).votos += votos;
    } else {
      const id = sq && sq !== "" ? sq : `n${numStr}`;
      const ck = `${cd}|${id}`;
      if (!cand.has(ck)) cand.set(ck, { cd, nome_mun: nm, sq: id, numero: numStr, nome: nomeVot, partido_num: numStr.slice(0, 2), votos: 0 });
      cand.get(ck).votos += votos;
      validos.set(cd, (validos.get(cd) || 0) + votos);
    }
    const lk = `${cd}|${r.NR_LOCAL_VOTACAO ?? "?"}`;
    if (!locais.has(lk)) locais.set(lk, { cd, nr: r.NR_LOCAL_VOTACAO ?? "", nome: r.NM_LOCAL_VOTACAO ?? "", endereco: r.DS_LOCAL_VOTACAO_ENDERECO ?? "", zona, votos: 0 });
    locais.get(lk).votos += votos;

    if (nmNorm === "CURRAISNOVOS") {
      CN_CD = cd;
      if (kind === "nominal") {
        const id = sq && sq !== "" ? sq : `n${numStr}`;
        const sk = `${zona}|${secao}|${id}`;
        cnSecoes.set(sk, (cnSecoes.get(sk) || 0) + votos);
      }
    }
  });

  const legendaPorMun = {};
  for (const l of legenda.values()) (legendaPorMun[l.cd] ??= []).push({ partido_num: l.partido_num, nome: l.nome, votos: l.votos });
  const porMun = {};
  for (const c of cand.values()) {
    porMun[c.cd] ??= { cd_tse: Number(c.cd), nome: c.nome_mun, total_votos_nominais: validos.get(c.cd) || 0, candidatos: [] };
    porMun[c.cd].candidatos.push({ sq: c.sq, numero: c.numero, nome: c.nome, partido_num: c.partido_num, votos: c.votos });
  }
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

  await save(`eleicao/serido-vereador-${YEAR}.json`, {
    meta: { source: "TSE votacao_secao", ano: YEAR, cargo: "Vereador", accessedAt },
    municipios: Object.values(porMun).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    locais_votacao: [...locais.values()].sort((a, b) => b.votos - a.votos),
  });

  const cnRows = [...cnSecoes.entries()].map(([k, v]) => { const [zona, secao, sq] = k.split("|"); return { zona: Number(zona), secao: Number(secao), sq, votos: v }; });
  await save(`eleicao/currais-novos-vereador-${YEAR}-secao.json`, {
    meta: { source: "TSE votacao_secao", municipio: "Currais Novos", cd_tse: Number(CN_CD), cargo: "Vereador", ano: YEAR, accessedAt, registros: cnRows.length },
    votos_por_secao: cnRows,
  });

  const totCand = [...cand.values()].length, totVotos = [...validos.values()].reduce((a, b) => a + b, 0);
  console.log(`\n${YEAR}: ${Object.keys(porMun).length} municípios, ${totCand} candidatos, ${totVotos.toLocaleString("pt-BR")} votos nominais, CN ${cnRows.length} registros.`);
  console.log("Cargos vistos (amostra):", [...cargosVistos].filter(Boolean).slice(0, 12).join(" | "));
}

main().catch((e) => { console.error("ERRO:", e.stack); process.exit(1); });
