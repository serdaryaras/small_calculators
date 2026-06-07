"use client";

import { useState } from "react";
import { ArtiLogo } from "@/components/ArtiLogo";
import type { EediReportData, ReportRowStatus } from "@/lib/eedi/build-report";
import { exportEediReportPdf } from "@/lib/eedi/export-pdf";

export const REPORT_ROW_STYLES: Record<ReportRowStatus, string> = {
  input: "bg-[var(--card)]",
  preview: "bg-blue-50/60 dark:bg-blue-950/25",
  result: "bg-[var(--background)]",
  neutral: "bg-transparent",
  section: "bg-slate-100 font-semibold dark:bg-slate-800/60",
  pass: "bg-green-100 dark:bg-green-950/80 border-l-4 border-l-green-600",
  fail: "bg-red-100 dark:bg-red-950/80 border-l-4 border-l-red-600",
};

const BANNER_STYLES = {
  pass: "border-green-500 bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100",
  fail: "border-red-500 bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
  na: "border-[var(--card-border)] bg-[var(--background)] text-[var(--muted)]",
};

type Props = {
  data: EediReportData;
  id?: string;
};

export function complianceBannerClass(pass: boolean | null): string {
  if (pass === true) return BANNER_STYLES.pass;
  if (pass === false) return BANNER_STYLES.fail;
  return BANNER_STYLES.na;
}

function PhaseTable({ rows }: { rows: EediReportData["phases"][number]["rows"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase text-[var(--muted)]">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Value</th>
            <th className="py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={`${r.name}-${i}`}
              className={`border-b border-[var(--card-border)]/50 ${REPORT_ROW_STYLES[r.status]}`}
            >
              <td className="py-2.5 pr-4 align-top font-medium">{r.name}</td>
              <td className="py-2.5 pr-4 align-top tabular-nums">{r.value}</td>
              <td className="py-2.5 align-top text-xs text-[var(--muted)]">
                {r.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EediReport({ data, id = "eedi-report" }: Props) {
  const [exportingPdf, setExportingPdf] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    try {
      await exportEediReportPdf(data);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div id={id} className="eedi-report mt-6 rounded-xl border border-[var(--card-border)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3 print:border-gray-300">
        <div className="flex flex-col gap-2">
          <ArtiLogo showSubtitle={false} linked={false} className="print:block" />
          <h3 className="text-lg font-semibold">{data.title}</h3>
          <p className="text-xs text-[var(--muted)]">{data.generatedAt}</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={exportingPdf}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {exportingPdf ? "Creating PDF…" : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded border border-[var(--card-border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
          >
            Print report
          </button>
        </div>
      </div>

      <div
        className={`mx-4 mt-4 rounded-lg border px-4 py-3 text-center text-sm font-semibold ${complianceBannerClass(data.overallPass)}`}
      >
        {data.overallLabel}
      </div>

      <p className="mx-4 mt-3 text-xs text-[var(--muted)]">{data.phaseNote}</p>

      <div className="space-y-0 p-4">
        {data.phases.map((phase, index) => (
          <section
            key={phase.id}
            className={`calculator-phase ${index > 0 ? "" : "!mt-0 !border-t-0 !pt-0"}`}
          >
            <header className="calculator-phase__header">
              <h2 className="calculator-phase__title">{phase.title}</h2>
              <p className="calculator-phase__description">{phase.description}</p>
            </header>
            <div className="calculator-phase__body">
              <PhaseTable rows={phase.rows} />
            </div>
          </section>
        ))}
      </div>

      <p className="border-t border-[var(--card-border)] px-4 py-3 text-xs text-[var(--muted)] print:text-gray-600">
        Indicative design estimate — verify with class society / verifier. MEPC.308(73)
        attained EEDI; MEPC.328 Phase 3 required EEDI.
      </p>
    </div>
  );
}
