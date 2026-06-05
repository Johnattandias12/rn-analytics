// Fase 2 — Camada socioeconômica base (IBGE) para os 167 municípios do RN
// População (Censo 2022) + PIB municipal + densidade/área. Fonte: API de agregados IBGE.
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROC = resolve(ROOT, "data/processed");

async function getJSON(url) {
  const r = await fetch(url, { headers: { "User-Agent": "painel-politico-rn/0.1" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r.json();
}
async function save(path, data) {
  await mkdir(dirname(path), { recursive: true });
  const txt = JSON.stringify(data, null, 2);
  await writeFile(path, txt, "utf8");
  console.log(`  ✓ ${path.replace(ROOT, ".")}  (${(txt.length / 1024).toFixed(1)} KB)`);
}

// Coleta uma variável de um agregado IBGE para todos os municípios do RN (N6 dentro de N3=24)
async function coletaAgregado(agregado, periodo, variavel) {
  const url = `https://servicodados.ibge.gov.br/api/v3/agregados/${agregado}/periodos/${periodo}/variaveis/${variavel}?localidades=N6[N3[24]]`;
  const json = await getJSON(url);
  const series = json?.[0]?.resultados?.[0]?.series ?? [];
  const map = new Map();
  for (const s of series) {
    const cod = Number(s.localidade?.id);
    const val = Object.values(s.serie ?? {})[0];
    const num = val === "-" || val === "..." || val == null ? null : Number(val);
    map.set(cod, Number.isFinite(num) ? num : null);
  }
  return map;
}

async function main() {
  const accessedAt = new Date().toISOString().slice(0, 10);
  const base = JSON.parse(await readFile(resolve(PROC, "municipios-rn.json"), "utf8"));

  console.log("→ População residente (Censo 2022, agregado 4714 var 93)…");
  const pop = await coletaAgregado(4714, 2022, 93);
  console.log(`  · ${[...pop.values()].filter((v) => v != null).length}/167 com população.`);

  console.log("→ Área territorial (km², agregado 1301 var 615)…");
  const area = await coletaAgregado(1301, 2010, 615).catch(() => new Map());

  console.log("→ PIB municipal a preços correntes (agregado 5938 var 37, 2021)…");
  const pib = await coletaAgregado(5938, 2021, 37).catch(() => new Map());

  const socio = base.municipios.map((m) => {
    const c = m.codigo_ibge;
    const populacao = pop.get(c) ?? null;
    const areaKm2 = area.get(c) ?? null;
    const pibMil = pib.get(c) ?? null;
    // PIB per capita calculado: PIB (mil R$) * 1000 / população
    const pibPerCapita = pibMil != null && populacao ? Math.round((pibMil * 1000) / populacao) : null;
    return {
      codigo_ibge: c,
      nome: m.nome,
      microrregiao: m.microrregiao,
      populacao_2022: populacao,
      area_km2: areaKm2,
      densidade_hab_km2: populacao && areaKm2 ? +(populacao / areaKm2).toFixed(2) : null,
      pib_2021_mil_reais: pibMil,
      pib_per_capita_2021: pibPerCapita,
    };
  });

  await save(resolve(PROC, "socioeconomico-rn.json"), {
    meta: {
      source: "IBGE — API Agregados (Censo 2022; PIB Municípios 2021)",
      uf: "RN",
      accessedAt,
      variaveis: {
        populacao_2022: "agregado 4714 / var 93 (Censo 2022)",
        area_km2: "agregado 1301 / var 615 (2010)",
        pib_2021_mil_reais: "agregado 5938 / var 37 (2021)",
        pib_per_capita_2021: "calculado: pib_mil*1000/populacao_2022",
      },
      nota: "Valores ausentes ficam null — nunca estimados. PIB per capita é derivado.",
    },
    municipios: socio,
  });

  // resumo do Seridó
  const micro = new Set(["Seridó Oriental", "Seridó Ocidental"]);
  const ser = socio.filter((m) => micro.has(m.microrregiao));
  const popSer = ser.reduce((a, b) => a + (b.populacao_2022 ?? 0), 0);
  const cn = socio.find((m) => m.nome === "Currais Novos");
  console.log(`\nResumo: Seridó (17 mun.) = ${popSer.toLocaleString("pt-BR")} hab.`);
  if (cn) console.log(`Currais Novos: ${cn.populacao_2022?.toLocaleString("pt-BR")} hab · PIB/cap R$ ${cn.pib_per_capita_2021?.toLocaleString("pt-BR") ?? "?"}`);
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
