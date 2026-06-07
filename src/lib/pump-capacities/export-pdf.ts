import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { loadArtiLogoForPdf } from "@/lib/arti-logo-pdf";
import type {
  PumpCapacitiesReportData,
  ReportPhase,
  ReportRow,
  ReportRowStatus,
} from "./build-report";

const ROW_FILL: Record<ReportRowStatus, [number, number, number] | null> = {
  pass: [198, 239, 206],
  fail: [254, 202, 202],
  input: [255, 255, 255],
  preview: [239, 246, 255],
  result: [243, 244, 246],
  neutral: [249, 250, 251],
  section: [226, 232, 240],
};

const PHASE_HEADER_FILL: Record<ReportPhase["id"], [number, number, number]> = {
  input: [59, 130, 246],
  preview: [100, 116, 139],
  results: [13, 79, 139],
};

function sanitizeFilename(title: string): string {
  return (
    title
      .replace(/^Pump Capacities Report — /i, "")
      .replace(/[^\w\-]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40) || "project"
  );
}

function pdfText(s: string): string {
  return s
    .replace(/×/g, "x")
    .replace(/≥/g, ">=")
    .replace(/·/g, "-")
    .replace(/³/g, "3")
    .replace(/√/g, "sqrt");
}

const LOGO_HEIGHT_MM = 10;
const LOGO_TOP_MM = 10;
const PAGE_BOTTOM_MM = 280;
const MARGIN_X = 14;

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_BOTTOM_MM) {
    doc.addPage();
    return 18;
  }
  return y;
}

function drawPhaseHeader(
  doc: jsPDF,
  y: number,
  phase: ReportPhase,
  pageWidth: number,
  isFirst: boolean,
): number {
  y = ensureSpace(doc, y, 22);

  if (!isFirst) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(MARGIN_X, y, pageWidth - MARGIN_X, y);
    y += 8;
  }

  const [r, g, b] = PHASE_HEADER_FILL[phase.id];
  doc.setFillColor(r, g, b);
  doc.roundedRect(MARGIN_X, y - 4, pageWidth - MARGIN_X * 2, 10, 1.5, 1.5, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(phase.title.toUpperCase(), MARGIN_X + 4, y + 2.5);
  y += 12;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const descLines = doc.splitTextToSize(pdfText(phase.description), pageWidth - MARGIN_X * 2);
  doc.text(descLines, MARGIN_X, y);
  y += descLines.length * 3.5 + 4;

  doc.setTextColor(0, 0, 0);
  return y;
}

function renderPhaseTable(
  doc: jsPDF,
  y: number,
  rows: ReportRow[],
  pageWidth: number,
): number {
  if (rows.length === 0) return y;

  y = ensureSpace(doc, y, 20);

  const body = rows.map((r) => [
    pdfText(r.name),
    pdfText(r.value),
    pdfText(r.description),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Name", "Value", "Description"]],
    body,
    margin: { left: MARGIN_X, right: MARGIN_X },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [13, 79, 139],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 48 },
      2: { cellWidth: "auto" },
    },
    didParseCell: (hook) => {
      if (hook.section !== "body") return;
      const tableRow = rows[hook.row.index];
      if (!tableRow) return;
      const fill = ROW_FILL[tableRow.status];
      if (fill) {
        hook.cell.styles.fillColor = fill;
      }
      if (tableRow.status === "section") {
        hook.cell.styles.fontStyle = "bold";
        hook.cell.styles.textColor = [30, 41, 59];
        if (hook.column.index === 0) {
          hook.cell.styles.fillColor = ROW_FILL.section!;
        }
      }
      if (tableRow.status === "pass") {
        hook.cell.styles.textColor = [20, 83, 45];
      }
      if (tableRow.status === "fail") {
        hook.cell.styles.textColor = [127, 29, 29];
      }
    },
  });

  return (
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
    y + 20
  ) + 6;
}

export async function exportPumpCapacitiesReportPdf(
  data: PumpCapacitiesReportData,
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  const logo = await loadArtiLogoForPdf();
  if (logo) {
    const logoWidthMm = (logo.width / logo.height) * LOGO_HEIGHT_MM;
    doc.addImage(logo.dataUrl, "JPEG", MARGIN_X, LOGO_TOP_MM, logoWidthMm, LOGO_HEIGHT_MM);
    y = LOGO_TOP_MM + LOGO_HEIGHT_MM + 8;
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(pdfText(data.title), MARGIN_X, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${data.generatedAt}`, MARGIN_X, y);
  y += 5;
  doc.text(pdfText(data.summaryNote), MARGIN_X, y, { maxWidth: pageWidth - MARGIN_X * 2 });
  y += 10;

  if (data.overallPass === true) {
    doc.setFillColor(198, 239, 206);
    doc.setTextColor(20, 83, 45);
  } else if (data.overallPass === false) {
    doc.setFillColor(254, 202, 202);
    doc.setTextColor(127, 29, 29);
  } else {
    doc.setFillColor(241, 245, 249);
    doc.setTextColor(71, 85, 105);
  }
  doc.roundedRect(MARGIN_X, y - 5, pageWidth - MARGIN_X * 2, 12, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(pdfText(data.overallLabel), pageWidth / 2, y + 2, { align: "center" });
  y += 16;
  doc.setTextColor(0, 0, 0);

  for (let i = 0; i < data.phases.length; i++) {
    const phase = data.phases[i]!;
    y = drawPhaseHeader(doc, y, phase, pageWidth, i === 0);
    y = renderPhaseTable(doc, y, phase.rows, pageWidth);
  }

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  y = ensureSpace(doc, y, 12);
  doc.text(
    "Indicative design estimate — verify pump capacities with Bureau Veritas and project specifications.",
    MARGIN_X,
    y,
    { maxWidth: pageWidth - MARGIN_X * 2 },
  );

  const name = sanitizeFilename(data.title);
  doc.save(`Pump-Capacities-Report-${name}.pdf`);
}
