import { collectPumpParameters } from "./collect-parameters";
import type { PumpCapacitiesResult } from "./types";
import type { PumpCapacitiesFormState } from "./validate-and-calculate";

export type ReportRowStatus =
  | "input"
  | "preview"
  | "result"
  | "pass"
  | "fail"
  | "neutral"
  | "section";

export type ReportRow = {
  name: string;
  value: string;
  description: string;
  status: ReportRowStatus;
};

export type ReportPhaseId = "input" | "preview" | "results";

export type ReportPhase = {
  id: ReportPhaseId;
  title: string;
  description: string;
  rows: ReportRow[];
};

export type PumpCapacitiesReportData = {
  title: string;
  generatedAt: string;
  summaryNote: string;
  phases: ReportPhase[];
  overallPass: boolean | null;
  overallLabel: string;
};

function row(
  name: string,
  value: string | number | boolean,
  description: string,
  status: ReportRowStatus,
): ReportRow {
  return { name, value: String(value), description, status };
}

function section(title: string, description = ""): ReportRow {
  return { name: title, value: "—", description, status: "section" };
}

function fmt(n: number, digits = 1): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function appendFirePumpRows(rows: ReportRow[], fire: PumpCapacitiesResult["fire"]) {
  if (fire.passengerBilgeReferenceM3H != null) {
    rows.push(
      row(
        "Passenger bilge reference",
        `${fmt(fire.passengerBilgeReferenceM3H)} m³/h`,
        "Each independent bilge pump — same L, B, D (cargo fire rule)",
        "preview",
      ),
    );
  }
  rows.push(
    row(
      "Fire pumps equal?",
      fire.firePumpsEqual ? "Yes" : "No",
      fire.firePumpsEqual ? "Total ÷ pump count" : "Asymmetric layout",
      "preview",
    ),
    row(
      "Total fire pump capacity",
      `${fmt(fire.totalRequiredM3H)} m³/h`,
      fire.totalCappedM3H ? "Capped at 180 m³/h (cargo)" : "Rule minimum total",
      "preview",
    ),
    row("Minimum main fire pumps", fire.minMainPumpCount, "SOLAS II-2/10.2.2.1", "preview"),
    row(
      "Capacity per pump (equal)",
      `${fmt(fire.equalSplitCapacityM3H)} m³/h`,
      `${fmt(fire.totalRequiredM3H)} ÷ ${fire.minMainPumpCount}, min 25 m³/h`,
      "preview",
    ),
  );

  if (fire.asymmetricGuidance) {
    rows.push(
      row(
        "If unequal (optional)",
        fire.asymmetricGuidance.line,
        "Smallest at SOLAS floor; others share remaining capacity — informational only",
        "neutral",
      ),
    );
  }

  rows.push(
    row(
      "Emergency fire pump",
      `${fmt(fire.emergencyRequiredM3H)} m³/h`,
      fire.emergencyCappedM3H
        ? "Capped at 72 m³/h (container)"
        : "≥ 40% of total, FSS Ch.12 absolute min",
      "preview",
    ),
  );
}

function buildPreviewRows(result: PumpCapacitiesResult): ReportRow[] {
  const { bilge, fire } = result;
  const rows: ReportRow[] = [];

  rows.push(section("Bilge system", "BV NR467 Pt C, Ch 1, Sec 10."));
  rows.push(
    row("Bilge main diameter d", `${bilge.bilgeMainDiameterMm} mm`, "d = 25 + 1.68√(L·(B+D))", "preview"),
    row("Water velocity", `${bilge.waterVelocityMs} m/s`, "Through required bilge main", "preview"),
    row("Capacity per bilge pump", `${fmt(bilge.capacityPerPumpM3H)} m³/h`, bilge.formulaNote, "preview"),
    row("Minimum bilge pumps", bilge.minPumpCount, "BV [6.7.1] — cargo 2, passenger 3", "preview"),
    row("Total bilge capacity", `${fmt(bilge.totalRequiredM3H)} m³/h`, `${bilge.minPumpCount} × ${fmt(bilge.capacityPerPumpM3H)} m³/h`, "preview"),
  );

  rows.push(section("Fire fighting", "SOLAS II-2/10 via BV Pt C, Ch 4, Sec 6."));
  appendFirePumpRows(rows, fire);

  return rows;
}

function buildResultsRows(result: PumpCapacitiesResult): ReportRow[] {
  const { bilge, fire } = result;
  const rows: ReportRow[] = [];

  rows.push(section("Bilge pumps — required", bilge.ruleRef));
  rows.push(
    row("Bilge main d", `${bilge.bilgeMainDiameterMm} mm`, "Internal diameter of bilge main", "result"),
    row("Rule capacity each", `${fmt(bilge.capacityPerPumpM3H)} m³/h`, bilge.formulaNote, "result"),
    row("Min pump count", bilge.minPumpCount, "Power bilge pumps connected to bilge main", "result"),
  );

  rows.push(section("Fire pumps — required", "SOLAS II-2/10.2.4 · FSS Code Ch.12"));
  rows.push(
    row(
      "Fire pumps equal?",
      fire.firePumpsEqual ? "Yes" : "No",
      fire.firePumpsEqual ? "Equal split" : "Asymmetric layout",
      "result",
    ),
    row(
      "Total capacity",
      `${fmt(fire.totalRequiredM3H)} m³/h`,
      fire.totalCappedM3H ? "180 m³/h cap applied" : "Uncapped rule value",
      "result",
    ),
    row(
      "Each pump (equal)",
      `${fmt(fire.equalSplitCapacityM3H)} m³/h`,
      `Total ÷ ${fire.minMainPumpCount} main fire pumps`,
      "result",
    ),
  );

  if (fire.asymmetricGuidance) {
    rows.push(
      row(
        "If unequal (optional)",
        fire.asymmetricGuidance.line,
        "Smallest at SOLAS floor; others share remaining capacity — informational only",
        "neutral",
      ),
    );
  }

  rows.push(
    row(
      "Emergency pump",
      `${fmt(fire.emergencyRequiredM3H)} m³/h`,
      "Independent emergency fire pump where required",
      "result",
    ),
  );

  for (const note of result.notes) {
    rows.push(row("Note", "—", note, "neutral"));
  }

  return rows;
}

export function buildPumpCapacitiesReport(
  form: PumpCapacitiesFormState,
  result: PumpCapacitiesResult,
  shipName: string,
): PumpCapacitiesReportData {
  const inputRows: ReportRow[] = collectPumpParameters(form).map((p) =>
    row(p.name, p.value, p.description, "input"),
  );

  const resultsRows = buildResultsRows(result);

  const phases: ReportPhase[] = [
    {
      id: "input",
      title: "Input",
      description: "Ship principal dimensions and fire pump layout.",
      rows: inputRows,
    },
    {
      id: "preview",
      title: "Preview",
      description: "Live bilge and fire pump requirements from current inputs.",
      rows: buildPreviewRows(result),
    },
    {
      id: "results",
      title: "Results",
      description: "Confirmed rule capacities after Calculate.",
      rows: resultsRows,
    },
  ];

  return {
    title: `Pump Capacities Report — ${shipName || "Project"}`,
    generatedAt: new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    summaryNote:
      "Input · Preview · Results — BV NR467 bilge pumps (Pt C, Ch 1, Sec 10) and fire pumps (Pt C, Ch 4, Sec 6 / SOLAS II-2).",
    phases,
    overallPass: null,
    overallLabel: "Rule capacities calculated — verify with class society.",
  };
}
