// Utilitários de coleta TSE: download com User-Agent, extração de zip, parser de CSV latin-1.
import { createWriteStream, existsSync, statSync } from "node:fs";
import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const RAW = resolve(ROOT, "data/raw");
export const PROC = resolve(ROOT, "data/processed");

const UA = "Mozilla/5.0 (painel-politico-rn coleta dados abertos)";

// Baixa uma URL para destino, pulando se já existir com tamanho > 0.
export async function download(url, dest) {
  await mkdir(dirname(dest), { recursive: true });
  if (existsSync(dest) && statSync(dest).size > 0) {
    console.log(`  · cache: ${basename(dest)} (${(statSync(dest).size / 1048576).toFixed(1)} MB)`);
    return dest;
  }
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  console.log(`  ✓ baixado: ${basename(dest)} (${(statSync(dest).size / 1048576).toFixed(1)} MB)`);
  return dest;
}

// Extrai zip num diretório usando PowerShell Expand-Archive (Windows).
export async function unzip(zipPath, outDir) {
  await mkdir(outDir, { recursive: true });
  const cmd = `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${outDir}' -Force`;
  await execFileP("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", cmd], { maxBuffer: 1 << 28 });
  return outDir;
}

// Lista CSVs de um diretório.
export async function listCsv(dir) {
  const files = await readdir(dir);
  return files.filter((f) => f.toLowerCase().endsWith(".csv")).map((f) => resolve(dir, f));
}

// Lê CSV TSE (latin1, separador ;, aspas) e itera por registros como objetos.
// callback(record) por linha; retorna { header, count }.
export async function parseCsvTse(path, onRow) {
  const buf = await readFile(path);
  const text = buf.toString("latin1");
  let header = null;
  let count = 0;
  let start = 0;
  const n = text.length;
  for (let i = 0; i <= n; i++) {
    if (i === n || text[i] === "\n") {
      let line = text.slice(start, i);
      start = i + 1;
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line) continue;
      const cols = splitSemicolon(line);
      if (!header) { header = cols.map((c) => c.replace(/^"|"$/g, "")); continue; }
      const rec = {};
      for (let j = 0; j < header.length; j++) rec[header[j]] = (cols[j] ?? "").replace(/^"|"$/g, "");
      onRow(rec);
      count++;
    }
  }
  return { header, count };
}

function splitSemicolon(line) {
  // TSE usa aspas em todos os campos e separador ; — split simples basta pois ; não aparece dentro de aspas nos dados.
  const out = [];
  let cur = "";
  let inq = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inq = !inq;
    else if (ch === ";" && !inq) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export { basename, resolve, rm };
