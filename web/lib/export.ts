// Exportação de relatórios — CSV, XLSX (planilha) e PDF. Tudo client-side.

type Row = Record<string, string | number | null | undefined>;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function exportCSV(filename: string, rows: Row[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n");
  downloadBlob(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), filename);
}

export async function exportXLSX(filename: string, sheets: { name: string; rows: Row[] }[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ vazio: "sem dados" }]);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}

export type PdfTable = { columns: string[]; rows: (string | number)[][] };

const NAVY: [number, number, number] = [24, 37, 81];
const ROYAL: [number, number, number] = [12, 82, 154];
const GREEN: [number, number, number] = [0, 155, 58];
const GOLD: [number, number, number] = [244, 194, 13];
const INK: [number, number, number] = [40, 48, 66];
const MUTED: [number, number, number] = [120, 130, 150];

// desenha a marca da RN Analytics (quadrado navy + "RN" + ponto dourado)
function drawMark(doc: import("jspdf").jsPDF, x: number, y: number, s: number) {
  doc.setFillColor(...NAVY);
  doc.roundedRect(x, y, s, s, s * 0.22, s * 0.22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(s * 0.42);
  doc.text("RN", x + s / 2, y + s / 2 + s * 0.15, { align: "center" });
  doc.setFillColor(...GOLD);
  doc.circle(x + s * 0.80, y + s * 0.22, s * 0.085, "F");
}

export async function exportPDF(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  kpis?: { label: string; value: string }[];
  table: PdfTable;
}) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // ===== cabeçalho =====
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 78, "F");
  // faixa de acento (royal -> verde) simulada por dois blocos
  doc.setFillColor(...ROYAL);
  doc.rect(0, 78, W * 0.62, 4, "F");
  doc.setFillColor(...GREEN);
  doc.rect(W * 0.62, 78, W * 0.38, 4, "F");

  drawMark(doc, 40, 22, 34);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("RN Analytics", 86, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(190, 205, 232);
  doc.text("Inteligência eleitoral e socioeconômica do Rio Grande do Norte", 86, 58);

  // data de emissão (canto direito)
  const hoje = new Date().toLocaleDateString("pt-BR");
  doc.setFontSize(8.5);
  doc.setTextColor(170, 188, 220);
  doc.text(`Emitido em ${hoje}`, W - 40, 42, { align: "right" });

  // ===== título =====
  let y = 108;
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  const titleLines = doc.splitTextToSize(opts.title, W - 80);
  doc.text(titleLines, 40, y);
  y += titleLines.length * 17;
  // sublinhado de acento
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2.4);
  doc.line(40, y - 6, 70, y - 6);
  y += 6;

  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    const subLines = doc.splitTextToSize(opts.subtitle, W - 80);
    doc.text(subLines, 40, y);
    y += subLines.length * 13 + 4;
  }

  // ===== KPIs =====
  if (opts.kpis?.length) {
    y += 6;
    const gap = 10;
    const cw = (W - 80 - gap * (opts.kpis.length - 1)) / opts.kpis.length;
    opts.kpis.forEach((k, i) => {
      const x = 40 + i * (cw + gap);
      doc.setFillColor(247, 249, 252);
      doc.setDrawColor(228, 234, 244);
      doc.setLineWidth(0.8);
      doc.roundedRect(x, y, cw, 50, 7, 7, "FD");
      // barrinha de acento à esquerda
      doc.setFillColor(...ROYAL);
      doc.roundedRect(x, y, 3.5, 50, 1.5, 1.5, "F");
      doc.setFontSize(7.2);
      doc.setTextColor(...MUTED);
      doc.text(k.label.toUpperCase(), x + 12, y + 17, { maxWidth: cw - 18 });
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...NAVY);
      doc.text(doc.splitTextToSize(k.value, cw - 18)[0] ?? k.value, x + 12, y + 37);
      doc.setFont("helvetica", "normal");
    });
    y += 66;
  }

  // ===== tabela =====
  autoTable(doc, {
    startY: y,
    head: [opts.table.columns],
    body: opts.table.rows,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5.5, textColor: INK, lineColor: [232, 237, 245], lineWidth: 0.5 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9, halign: "left" },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    margin: { left: 40, right: 40 },
    didDrawPage: () => {
      // rodapé em cada página
      doc.setDrawColor(228, 234, 244);
      doc.setLineWidth(0.8);
      doc.line(40, H - 38, W - 40, H - 38);
      doc.setFontSize(7.6);
      doc.setTextColor(...MUTED);
      doc.text("Fontes: TSE (Dados Abertos) e IBGE  ·  rn-analytics.vercel.app", 40, H - 24);
      doc.setTextColor(...ROYAL);
      doc.setFont("helvetica", "bold");
      doc.text("RN Analytics", W - 40, H - 24, { align: "right" });
      doc.setFont("helvetica", "normal");
    },
  });

  // numeração de páginas (após saber o total)
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.6);
    doc.setTextColor(...MUTED);
    doc.text(`${p} / ${pages}`, W / 2, H - 24, { align: "center" });
  }

  doc.save(opts.filename);
}
