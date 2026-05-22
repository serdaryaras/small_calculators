import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { loadArtiLogoForPdf } from "@/lib/arti-logo-pdf";
import type { EediReportData, ReportRowStatus } from "./build-report";

const ROW_FILL: Record<ReportRowStatus, [number, number, number] | null> = {
  pass: [198, 239, 206],
  fail: [254, 202, 202],
  input: [255, 255, 255],
  result: [243, 244, 246],
  neutral: [249, 250, 251],
};

function sanitizeFilename(title: string): string {
  return title
    .replace(/^EEDI Report — /i, "")
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40) || "project";
}

/** Replace Unicode subscripts etc. for standard PDF fonts */
function pdfText(s: string): string {
  return s
    .replace(/CO₂/g, "CO2")
    .replace(/gCO₂/g, "gCO2")
    .replace(/×/g, "x")
    .replace(/≤/g, "<=")
    .replace(/Π/g, "Product")
    .replace(/∇/g, "disp");
}

const LOGO_HEIGHT_MM = 10;
const LOGO_TOP_MM = 10;

export async function exportEediReportPdf(data: EediReportData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  const logo = await loadArtiLogoForPdf();
  if (logo) {
    const logoWidthMm = (logo.width / logo.height) * LOGO_HEIGHT_MM;
    doc.addImage(logo.dataUrl, "JPEG", 14, LOGO_TOP_MM, logoWidthMm, LOGO_HEIGHT_MM);
    y = LOGO_TOP_MM + LOGO_HEIGHT_MM + 8;
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(pdfText(data.title), 14, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${data.generatedAt}`, 14, y);
  y += 5;
  doc.text(pdfText(data.phaseNote), 14, y, { maxWidth: pageWidth - 28 });
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
  doc.roundedRect(14, y - 5, pageWidth - 28, 12, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(pdfText(data.overallLabel), pageWidth / 2, y + 2, { align: "center" });
  y += 16;
  doc.setTextColor(0, 0, 0);

  const body = data.rows.map((r) => [
    pdfText(r.name),
    pdfText(r.value),
    pdfText(r.description),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Name", "Value", "Description"]],
    body,
    margin: { left: 14, right: 14 },
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
      const row = data.rows[hook.row.index];
      if (!row) return;
      const fill = ROW_FILL[row.status];
      if (fill) {
        hook.cell.styles.fillColor = fill;
      }
      if (row.name === "—") {
        hook.cell.styles.fontStyle = "bold";
        hook.cell.styles.fillColor = [226, 232, 240];
      }
      if (row.status === "pass") {
        hook.cell.styles.textColor = [20, 83, 45];
      }
      if (row.status === "fail") {
        hook.cell.styles.textColor = [127, 29, 29];
      }
    },
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
    y + 20;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Indicative design estimate — verify with class society / verifier. MEPC.308(73) attained EEDI; MEPC.328 Phase 3 required EEDI.",
    14,
    finalY + 8,
    { maxWidth: pageWidth - 28 },
  );

  const name = sanitizeFilename(data.title);
  doc.save(`EEDI-Report-${name}.pdf`);
}
