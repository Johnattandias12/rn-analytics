// Gera SQL de carga para o schema rn_analytics (Supabase, dentro do projeto Axon).
// Saída em data/processed/supabase/*.sql — carregada via MCP execute_sql em lotes.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROC = resolve(ROOT, "data/processed");
const OUT = resolve(PROC, "supabase");

const q = (v) => (v === null || v === undefined || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? "null" : Number(v));

async function save(name, sql) {
  await mkdir(OUT, { recursive: true });
  await writeFile(resolve(OUT, name), sql, "utf8");
  console.log(`  ✓ ${name} (${(sql.length / 1024).toFixed(1)} KB)`);
}

// quebra linhas de VALUES em múltiplos INSERTs (lotes) e arquivos
function buildInserts(table, cols, rows, batch = 1500) {
  const files = [];
  for (let i = 0; i < rows.length; i += batch) {
    const slice = rows.slice(i, i + batch);
    const sql = `insert into ${table} (${cols.join(", ")}) values\n${slice.join(",\n")};\n`;
    files.push(sql);
  }
  return files;
}

async function main() {
  const muni = JSON.parse(await readFile(resolve(PROC, "municipios-rn.json"), "utf8")).municipios;
  const socio = JSON.parse(await readFile(resolve(PROC, "socioeconomico-rn.json"), "utf8")).municipios;
  const depara = JSON.parse(await readFile(resolve(PROC, "depara-tse-ibge.json"), "utf8")).municipios;
  const serido = JSON.parse(await readFile(resolve(PROC, "eleicao/serido-vereador-2024.json"), "utf8"));
  const cnSecao = JSON.parse(await readFile(resolve(PROC, "eleicao/currais-novos-vereador-2024-secao.json"), "utf8"));

  const cdTseByIbge = new Map(depara.filter((d) => d.codigo_ibge).map((d) => [d.codigo_ibge, d.cd_tse]));
  const seridoSet = new Set(serido.municipios.map((m) => m.codigo_ibge).filter(Boolean));

  // 1) municipios
  const muniRows = muni.map((m) =>
    `(${n(m.codigo_ibge)}, ${q(m.nome)}, ${q(m.microrregiao)}, ${q(m.mesorregiao)}, ${seridoSet.has(m.codigo_ibge)}, ${n(cdTseByIbge.get(m.codigo_ibge))})`
  );
  await save("01_municipios.sql",
    "truncate rn_analytics.municipios cascade;\n" +
    buildInserts("rn_analytics.municipios", ["codigo_ibge", "nome", "microrregiao", "mesorregiao", "is_serido", "cd_tse"], muniRows).join(""));

  // 2) socioeconomico
  const socioRows = socio.map((s) =>
    `(${n(s.codigo_ibge)}, ${n(s.populacao_2022)}, ${n(s.area_km2)}, ${n(s.densidade_hab_km2)}, ${n(s.pib_2021_mil_reais)}, ${n(s.pib_per_capita_2021)})`
  );
  await save("02_socioeconomico.sql",
    "truncate rn_analytics.socioeconomico cascade;\n" +
    buildInserts("rn_analytics.socioeconomico", ["codigo_ibge", "populacao_2022", "area_km2", "densidade_hab_km2", "pib_2021_mil_reais", "pib_per_capita_2021"], socioRows).join(""));

  // 3) candidatos vereador 2024
  const candRows = [];
  for (const m of serido.municipios) {
    for (const c of m.candidatos) {
      candRows.push(`(${n(m.cd_tse)}, ${n(m.codigo_ibge)}, ${q(m.nome)}, ${q(c.sq)}, ${q(c.numero)}, ${q(c.nome)}, ${q(c.partido_num)}, ${n(c.votos)}, ${n(c.rank)})`);
    }
  }
  const candFiles = buildInserts("rn_analytics.candidatos_vereador_2024",
    ["cd_tse", "codigo_ibge", "municipio", "sq_candidato", "numero", "nome", "partido_num", "votos", "rank"], candRows);
  await save("03_candidatos.sql", "truncate rn_analytics.candidatos_vereador_2024;\n" + candFiles.join(""));

  // 4) locais de votacao 2024
  const locRows = serido.locais_votacao.map((l) =>
    `(${n(l.cd)}, ${q(l.nr)}, ${q(l.nome)}, ${q(l.endereco)}, ${q(l.zona)}, ${n(l.votos)})`
  );
  await save("04_locais.sql", "truncate rn_analytics.locais_votacao_2024;\n" +
    buildInserts("rn_analytics.locais_votacao_2024", ["cd_tse", "nr_local", "nome", "endereco", "zona", "votos"], locRows).join(""));

  // 5) votos por secao Currais Novos (granular) — vários arquivos
  const cd = cnSecao.meta.cd_tse;
  const votoRows = cnSecao.votos_por_secao.map((v) => `(${n(cd)}, ${n(v.zona)}, ${n(v.secao)}, ${q(v.sq)}, ${n(v.votos)})`);
  const votoFiles = buildInserts("rn_analytics.votos_secao_cn_2024", ["cd_tse", "zona", "secao", "sq_candidato", "votos"], votoRows, 1600);
  await save("05_votos_cn_secao_TRUNCATE.sql", "truncate rn_analytics.votos_secao_cn_2024;\n");
  votoFiles.forEach((sql, i) => save(`05_votos_cn_secao_part${i + 1}.sql`, sql));

  console.log(`\nResumo: municipios ${muniRows.length}, socio ${socioRows.length}, candidatos ${candRows.length}, locais ${locRows.length}, votos_cn ${votoRows.length} (em ${votoFiles.length} partes).`);
}

main().catch((e) => { console.error("ERRO:", e.stack); process.exit(1); });
