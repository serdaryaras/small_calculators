import type { EediBreakdown } from "./calculation";
import { collectEediParameters, type EediFormState } from "./collect-parameters";
import { CATEGORY_LABELS, type ComplianceResult } from "./marpol-reg24";

export type ReportRowStatus = "input" | "result" | "pass" | "fail" | "neutral";

export type ReportRow = {
  name: string;
  value: string;
  description: string;
  status: ReportRowStatus;
};

export type EediReportData = {
  title: string;
  generatedAt: string;
  phaseNote: string;
  rows: ReportRow[];
  overallPass: boolean | null;
  overallLabel: string;
};

function row(
  name: string,
  value: string | number | boolean,
  description: string,
  status: ReportRowStatus,
): ReportRow {
  return {
    name,
    value: String(value),
    description,
    status,
  };
}

export function buildEediReport(
  formState: EediFormState,
  attained: EediBreakdown,
  compliance: ComplianceResult,
  shipName: string,
): EediReportData {
  const rows: ReportRow[] = [];

  rows.push(
    row("Report", "EEDI calculation summary", "Phase 3 (from 1 Jan 2025)", "neutral"),
    row("Ship / project", shipName || "—", "Project identifier", "neutral"),
    row(
      "Ship type",
      CATEGORY_LABELS[formState.regCategory],
      "Regulation 2 category",
      "neutral",
    ),
  );

  rows.push(
    row("—", "—", "Input parameters", "neutral"),
  );

  for (const p of collectEediParameters(formState)) {
    rows.push(row(p.name, p.value, p.description, "input"));
  }

  rows.push(
    row("—", "—", "Attained EEDI (MEPC.308 §2.1)", "neutral"),
  );

  rows.push(
    row(
      "Attained EEDI",
      `${attained.attainedEedi.toFixed(3)} gCO₂/t·nm`,
      "Calculated Energy Efficiency Design Index",
      "result",
    ),
    row(
      "P_AE (used)",
      `${attained.pAeKw.toLocaleString("en-US", { maximumFractionDigits: 1 })} kW`,
      "Auxiliary power in formula",
      "result",
    ),
    row(
      "Σ P_ME @ 75% MCR",
      `${attained.pMeItemsKw.reduce((a, b) => a + b, 0).toFixed(1)} kW`,
      "Sum of main-engine powers",
      "result",
    ),
    row(
      "Numerator",
      attained.numeratorGco2PerH.toExponential(4),
      "g CO₂/h (with Πf_j × Πf_eff)",
      "result",
    ),
    row(
      "Denominator",
      attained.denominatorTNmPerH.toExponential(4),
      "f_i × f_c × f_l × Capacity × V_ref × f_w",
      "result",
    ),
  );

  for (const note of attained.notes) {
    rows.push(row("Note", note, "Calculation note", "neutral"));
  }

  rows.push(
    row("—", "—", "Required EEDI — Phase 3 (Reg. 24 / MEPC.328)", "neutral"),
  );

  let overallPass: boolean | null = compliance.complies;
  let overallLabel = "n/a — required EEDI not applicable for this size / phase";

  if (compliance.referenceLineEedi != null) {
    rows.push(
      row(
        "Reference line EEDI",
        `${compliance.referenceLineEedi.toFixed(3)} gCO₂/t·nm`,
        "Table 2 reference line",
        "neutral",
      ),
    );
  }

  if (compliance.reductionPercent != null) {
    rows.push(
      row(
        "Reduction factor X",
        `${compliance.reductionPercent.toFixed(2)} %`,
        "Phase 3 (from 1 Jan 2025)",
        "neutral",
      ),
    );
  }

  if (compliance.requiredEedi != null) {
    const pass = compliance.complies === true;
    const fail = compliance.complies === false;
    const status: ReportRowStatus = pass ? "pass" : fail ? "fail" : "neutral";
    const margin = compliance.margin ?? 0;

    rows.push(
      row(
        "Required EEDI",
        `${compliance.requiredEedi.toFixed(3)} gCO₂/t·nm`,
        "Maximum permitted attained value",
        "neutral",
      ),
      row(
        "Attained vs required",
        `${attained.attainedEedi.toFixed(3)} ≤ ${compliance.requiredEedi.toFixed(3)}`,
        "Attained must not exceed required",
        status,
      ),
      row(
        "Margin",
        `${margin >= 0 ? "+" : ""}${margin.toFixed(3)} gCO₂/t·nm`,
        "Required − attained (positive = below limit)",
        status,
      ),
      row(
        "Compliance criterion",
        pass ? "PASS" : "FAIL",
        pass
          ? "Attained EEDI is not greater than required EEDI"
          : "Attained EEDI exceeds required EEDI",
        status,
      ),
    );

    overallPass = pass;
    overallLabel = pass
      ? `PASS — margin ${margin >= 0 ? "+" : ""}${margin.toFixed(3)} gCO₂/t·nm`
      : `FAIL — shortfall ${margin.toFixed(3)} gCO₂/t·nm`;
  }

  for (const m of compliance.messages) {
    rows.push(row("Reg. 24 note", m, "Regulatory message", "neutral"));
  }

  return {
    title: `EEDI Report — ${shipName || "Project"}`,
    generatedAt: new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
    phaseNote: "Phase 3 only — ships subject to reduction factor from 1 January 2025.",
    rows,
    overallPass,
    overallLabel,
  };
}
