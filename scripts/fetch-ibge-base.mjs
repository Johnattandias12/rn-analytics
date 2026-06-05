// Fase 2 — Base geográfica do RN a partir do IBGE
// Gera: lista de municípios (cód. IBGE + região) e malha GeoJSON para o mapa.
// Fonte: servicodados.ibge.gov.br  ·  RN = UF 24
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = resolve(ROOT, "data/raw");
const PROC = resolve(ROOT, "data/processed");

async function getJSON(url) {
  const r = await fetch(url, { headers: { "User-Agent": "painel-politico-rn/0.1" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r.json();
}

async function save(path, data) {
  await mkdir(dirname(path), { recursive: true });
  const txt = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  await writeFile(path, txt, "utf8");
  console.log(`  ✓ ${path.replace(ROOT, ".")}  (${(txt.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  const accessedAt = new Date().toISOString().slice(0, 10);

  // 1) Municípios do RN com hierarquia (microrregião, mesorregião, região imediata/intermediária)
  console.log("→ Municípios do RN (IBGE localidades)…");
  const muni = await getJSON(
    "https://servicodados.ibge.gov.br/api/v1/localidades/estados/24/municipios"
  );
  await save(resolve(RAW, "ibge-municipios-rn.raw.json"), muni);

  const municipios = muni
    .map((m) => ({
      codigo_ibge: m.id,
      nome: m.nome,
      microrregiao: m.microrregiao?.nome ?? null,
      mesorregiao: m.microrregiao?.mesorregiao?.nome ?? null,
      regiao_imediata: m["regiao-imediata"]?.nome ?? null,
      regiao_intermediaria: m["regiao-imediata"]?.["regiao-intermediaria"]?.nome ?? null,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  await save(resolve(PROC, "municipios-rn.json"), {
    meta: { source: "IBGE — API Localidades", uf: "RN", uf_codigo: 24, total: municipios.length, accessedAt },
    municipios,
  });

  // marca quais pertencem ao Seridó (microrregiões oficiais)
  const microSerido = new Set(["Seridó Oriental", "Seridó Ocidental"]);
  const serido = municipios.filter((m) => microSerido.has(m.microrregiao));
  console.log(`  · ${municipios.length} municípios no total; ${serido.length} nas microrregiões do Seridó.`);

  // 2) Malha GeoJSON dos municípios do RN (para o mapa SVG clicável)
  console.log("→ Malha GeoJSON municipal do RN (IBGE malhas v4)…");
  const geo = await getJSON(
    "https://servicodados.ibge.gov.br/api/v4/malhas/estados/24?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio"
  );
  await save(resolve(PROC, "rn-municipios.geojson"), geo);
  const nFeat = geo?.features?.length ?? 0;
  console.log(`  · ${nFeat} polígonos municipais no GeoJSON.`);

  console.log("\nConcluído. Próximo: de-para TSE↔IBGE e agregados socioeconômicos.");
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
