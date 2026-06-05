import { download, unzip, listCsv, parseCsvTse, RAW, resolve, basename } from "./lib-tse.mjs";

const YEAR = 2024;
const url = `https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_${YEAR}_RN.zip`;
const zip = resolve(RAW, `votacao_secao_${YEAR}_RN.zip`);
const out = resolve(RAW, `votacao_secao_${YEAR}_RN`);

console.log(`→ Download ${YEAR}…`);
await download(url, zip);
console.log("→ Extraindo…");
await unzip(zip, out);
const csvs = await listCsv(out);
console.log("CSVs:", csvs.map((f) => basename(f)));

// Lê só o header + 1 linha de exemplo do primeiro CSV
const first = csvs[0];
let printed = 0;
const { header, count } = await parseCsvTse(first, (rec) => {
  if (printed === 0) {
    console.log("\n=== COLUNAS ===");
    console.log(Object.keys(rec).join(" | "));
    console.log("\n=== EXEMPLO ===");
    for (const [k, v] of Object.entries(rec)) console.log(`  ${k} = ${v}`);
    printed++;
  }
});
console.log(`\nTotal de linhas no 1º CSV: ${count.toLocaleString("pt-BR")}`);
