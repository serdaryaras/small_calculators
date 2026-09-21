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

function appendBilgeRows(
  rows: ReportRow[],
  result: PumpCapacitiesResult,
  status: "preview" | "result",
) {
  const { bilge } = result;
  const tanker = bilge.shipType === "tanker";

  rows.push(
    section(
      tanker ? "Machinery-space bilge (tanker)" : "Bilge system",
      bilge.ruleRef,
    ),
    row("Formula", bilge.formulaNote, bilge.ruleRef, status),
    row(
      tanker ? "ER bilge main d (formula)" : "Bilge main d (formula)",
      `${fmt(bilge.dFormulaMm)} mm`,
      bilge.formulaNote,
      status,
    ),
  );

  if (bilge.dTwiceMm != null) {
    rows.push(
      row(
        "d₁√2 check",
        `${fmt(bilge.dTwiceMm)} mm`,
        "Main ≥ branch diameter × √2 (Pt C [6.8.9])",
        status,
      ),
    );
  }

  rows.push(
    row(
      "Rule diameter d",
      `${fmt(bilge.dRuleMm)} mm`,
      tanker ? "max(formula, d₁√2)" : "From [6.8.1] / tanker rule",
      status,
    ),
    row(
      "Min actual diameter",
      `${fmt(bilge.dMinActualMm)} mm`,
      "max(d − 5, 60 mm, largest branch)",
      status,
    ),
    row(
      "Recommended DN",
      `DN ${bilge.recommendedDnMm}`,
      "Next commercial DN ≥ min actual",
      status,
    ),
    row(
      "Capacity per bilge pump",
      `${fmt(bilge.capacityPerPumpM3H)} m³/h`,
      bilge.reducedQ
        ? "Q = 0.00345 × d² (L < 35 m cargo)"
        : "Q = 0.00565 × d²",
      status,
    ),
    row("Minimum bilge pumps", bilge.pumpCount, bilge.extraNote, status),
    row(
      "Total bilge capacity",
      `${fmt(bilge.totalCapacityM3H)} m³/h`,
      `${bilge.pumpCount} × ${fmt(bilge.capacityPerPumpM3H)} m³/h`,
      status,
    ),
  );

  if (bilge.compensationAllowed) {
    rows.push(
      row(
        "One pump may be ≥ 70%",
        `${fmt(bilge.minOnePumpM3H)} m³/h`,
        "Compensation allowed (not passenger)",
        "neutral",
      ),
    );
  }

  if (bilge.cargoAreaPumps > 0) {
    rows.push(
      row(
        "Cargo-area bilge pumps",
        bilge.cargoAreaPumps,
        "At least one additional pump — no rule capacity formula",
        status,
      ),
    );
  }

  if (bilge.numeralInfo) {
    rows.push(
      row(
        "Bilge pump numeral",
        fmt(bilge.numeralInfo.numeral),
        `K = ${bilge.numeralInfo.K}, P₁ = ${bilge.numeralInfo.P1}`,
        status,
      ),
    );
  }

  if (bilge.distributionBoxMm != null) {
    rows.push(
      row(
        "Distribution box (indicative)",
        `${fmt(bilge.distributionBoxMm)} mm`,
        "√(d₁² + d₂²) of two largest branches, ≤ main d",
        "neutral",
      ),
    );
  }

  const branchList = bilge.branches.filter((b) => b.valid);
  if (branchList.length > 0 || bilge.machineryBranch?.synthetic) {
    rows.push(
      section(
        "Branch bilge suctions",
        "d₁ = max(50, 25 + 2.16√(L₁·(B+D))) mm",
      ),
    );
    for (const branch of branchList) {
      rows.push(
        row(
          branch.label,
          `${fmt(branch.d1Mm!)} mm`,
          `L₁ = ${branch.lengthM} m${branch.isMachinery ? " · machinery" : ""}`,
          status,
        ),
      );
    }
    if (bilge.machineryBranch?.synthetic) {
      const m = bilge.machineryBranch;
      rows.push(
        row(
          m.label,
          `${fmt(m.d1Mm!)} mm`,
          `L₀ = ${m.lengthM} m — synthetic from engine-room length`,
          status,
        ),
      );
    }
  }
}

function appendFireRows(
  rows: ReportRow[],
  fire: PumpCapacitiesResult["fire"],
  status: "preview" | "result",
) {
  rows.push(
    section("Fire fighting", "BV NR467 Pt C Ch 4 Sec 6 / SOLAS II-2/10"),
    row("VT1 (pump number)", fire.vt1Label, `VT1 = ${fire.vt1}`, status),
    row("VT2 (capacity rule)", fire.vt2Label, `VT2 = ${fire.vt2}`, status),
    row(
      "Bilge reference d",
      `${fmt(fire.dBilgeRefMm)} mm`,
      "Always general formula 25 + 1.68√(L·(B+D)) — not tanker ER diameter",
      status,
    ),
    row(
      "Bilge reference Q",
      `${fmt(fire.qBilgeRefM3H)} m³/h`,
      "Q = 0.00565 × d²",
      status,
    ),
    row("Total fire capacity", `${fmt(fire.totalRequiredM3H)} m³/h`, fire.capNote, status),
    row("Main fire pumps", fire.pumpCount, "From VT1", status),
    row(
      "Each pump (equal)",
      `${fmt(fire.equalEachM3H)} m³/h`,
      `Total ÷ ${fire.pumpCount}, min 25 m³/h`,
      status,
    ),
  );

  if (!fire.firePumpsEqual) {
    rows.push(
      row(
        "Each pump (asymmetric info)",
        `${fmt(fire.asymmetricEachM3H)} m³/h`,
        "80% of equal-split floor — informational",
        "neutral",
      ),
    );
  }

  if (fire.monitors > 0) {
    rows.push(
      row(
        "Mobile water monitors",
        fire.monitors,
        "2 if B < 30 m, else 4 — 60 m³/h each",
        status,
      ),
    );
  }

  rows.push(
    row(
      "Hydrant pressure",
      `${fire.hydrantPressureNMm2} N/mm²`,
      "Minimum pressure at hydrants",
      status,
    ),
    row(
      "Emergency fire pump",
      fire.emergencyRequired && fire.emergencyM3H != null
        ? `${fmt(fire.emergencyM3H)} m³/h`
        : "Not required",
      fire.emergencyRequired
        ? "≥ 40% of total, min 25 m³/h (cargo/tanker ≥ 1000 GT)"
        : "Passenger ships — not required by this rule set",
      status,
    ),
  );
}

function buildPreviewRows(result: PumpCapacitiesResult): ReportRow[] {
  const rows: ReportRow[] = [];
  appendBilgeRows(rows, result, "preview");
  appendFireRows(rows, result.fire, "preview");
  return rows;
}

function buildResultsRows(result: PumpCapacitiesResult): ReportRow[] {
  const rows: ReportRow[] = [];
  appendBilgeRows(rows, result, "result");
  appendFireRows(rows, result.fire, "result");
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

  return {
    title: `Pump Capacities Report — ${shipName || "Project"}`,
    generatedAt: new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    summaryNote:
      "Input · Preview · Results — BV NR467 bilge (Pt C Ch 1 Sec 10 · Pt D Ch 7) and fire (Pt C Ch 4 Sec 6), aligned with 11-Pumps.",
    phases: [
      {
        id: "input",
        title: "Input",
        description: "Ship principal dimensions and options.",
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
        rows: buildResultsRows(result),
      },
    ],
    overallPass: null,
    overallLabel: "Rule capacities calculated — verify with class society.",
  };
}
