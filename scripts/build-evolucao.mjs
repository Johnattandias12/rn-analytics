// Consolida a evolução temporal de vereadores no Seridó (2012→2024).
// Lê eleicao/serido-vereador-<ano>.json e gera eleicao/evolucao-vereador-serido.json
import { readFile, writeFile } from "node:fs/promises";
import { PROC, resolve } from "./lib-tse.mjs";

const ANOS = [2012, 2016, 2020, 2024];
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

async function main() {
  const porAno = {};
  for (const ano of ANOS) {
    porAno[ano] = JSON.parse(await readFile(resolve(PROC, `eleicao/serido-vereador-${ano}.json`), "utf8"));
  }

  // índice município (codigo_ibge) -> { nome, cd_tse, por_ano, partidos }
  const muns = {};
  for (const ano of ANOS) {
    for (const m of porAno[ano].municipios) {
      const key = m.codigo_ibge ?? m.cd_tse;
      muns[key] ??= { codigo_ibge: m.codigo_ibge, cd_tse: m.cd_tse, nome: m.nome, microrregiao: m.microrregiao, por_ano: {}, partidos: {} };
      // totais do ano
      muns[key].por_ano[ano] = {
        nominais: m.total_votos_nominais,
        brancos: m.brancos ?? 0,
        nulos: m.nulos ?? 0,
        candidatos: m.qtd_candidatos,
        top: m.candidatos.slice(0, 5).map((c) => ({ nome: c.nome, numero: c.numero, partido: c.partido_num, votos: c.votos })),
      };
      // força por partido no ano (nominal + legenda)
      const part = {};
      for (const c of m.candidatos) part[c.partido_num] = (part[c.partido_num] ?? 0) + c.votos;
      for (const l of m.legenda ?? []) part[l.partido_num] = (part[l.partido_num] ?? 0) + l.votos;
      for (const [pnum, v] of Object.entries(part)) {
        muns[key].partidos[pnum] ??= {};
        muns[key].partidos[pnum][ano] = v;
      }
    }
  }

  await writeFile(
    resolve(PROC, "eleicao/evolucao-vereador-serido.json"),
    JSON.stringify({ meta: { source: "TSE votacao_secao (consolidado)", cargo: "Vereador", anos: ANOS, accessedAt: new Date().toISOString().slice(0, 10) }, municipios: muns }, null, 2),
    "utf8"
  );

  const cn = muns[2403103];
  console.log("✓ evolucao-vereador-serido.json gerado.");
  if (cn) {
    console.log("\nCurrais Novos — votos nominais por ano:");
    for (const ano of ANOS) console.log(`  ${ano}: ${cn.por_ano[ano]?.nominais?.toLocaleString("pt-BR") ?? "—"} (${cn.por_ano[ano]?.candidatos ?? "—"} candidatos)`);
    console.log("\nTop 3 partidos por força em 2024:");
    Object.entries(cn.partidos).map(([p, y]) => [p, y[2024] ?? 0]).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .forEach(([p, v]) => console.log(`  partido ${p}: 2012=${cn.partidos[p][2012] ?? 0} 2016=${cn.partidos[p][2016] ?? 0} 2020=${cn.partidos[p][2020] ?? 0} 2024=${v}`));
  }
}

main().catch((e) => { console.error("ERRO:", e.stack); process.exit(1); });
