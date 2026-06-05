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
  const navy: [number, number, number] = [24, 37, 81];
  const royal: [number, number, number] = [12, 82, 154];

  // cabeçalho
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("RN Analytics", 40, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 215, 240);
  doc.text("Inteligência eleitoral e socioeconômica do Rio Grande do Norte", 40, 52);

  let y = 100;
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(opts.title, 40, y);
  y += 18;
  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110, 120, 140);
    doc.text(opts.subtitle, 40, y);
    y += 16;
  }

  if (opts.kpis?.length) {
    y += 6;
    const cw = (W - 80) / opts.kpis.length;
    opts.kpis.forEach((k, i) => {
      const x = 40 + i * cw;
      doc.setDrawColor(225, 230, 240);
      doc.setFillColor(247, 249, 252);
      doc.roundedRect(x, y, cw - 8, 44, 6, 6, "FD");
      doc.setFontSize(8);
      doc.setTextColor(120, 130, 150);
      doc.text(k.label.toUpperCase(), x + 10, y + 16);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...royal);
      doc.text(k.value, x + 10, y + 34);
      doc.setFont("helvetica", "normal");
    });
    y += 60;
  }

  autoTable(doc, {
    startY: y,
    head: [opts.table.columns],
    body: opts.table.rows,
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, textColor: [40, 48, 66] },
    headStyles: { fillColor: royal, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    margin: { left: 40, right: 40 },
  });

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150, 158, 175);
    doc.text(
      `Fontes: TSE (Dados Abertos) e IBGE • Desenvolvido pela Beyonder IA — 2026 • Johnattan Dias • ${p}/${pages}`,
      40,
      doc.internal.pageSize.getHeight() - 24
    );
  }

  doc.save(opts.filename);
}
