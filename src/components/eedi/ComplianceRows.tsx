import type { ReactNode } from "react";
import type { ReportRowStatus } from "@/lib/eedi/build-report";
import { REPORT_ROW_STYLES } from "./EediReport";

export function ComplianceRow({
  name,
  value,
  description,
  status = "neutral",
}: {
  name: string;
  value: ReactNode;
  description: string;
  status?: ReportRowStatus;
}) {
  return (
    <div
      className={`grid gap-2 border-b border-[var(--card-border)] px-4 py-3 sm:grid-cols-[minmax(10rem,1fr)_minmax(8rem,12rem)_1fr] sm:items-start ${REPORT_ROW_STYLES[status]}`}
    >
      <div>
        <p className="text-sm font-semibold">{name}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
      </div>
      <div className="text-sm font-semibold tabular-nums text-[var(--accent)] sm:text-right">
        {value}
      </div>
    </div>
  );
}
