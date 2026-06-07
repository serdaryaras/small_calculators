import type { EediBreakdown } from "./calculation";
import { collectEediParameters, type EediFormState } from "./collect-parameters";
import { CATEGORY_LABELS, type ComplianceResult } from "./marpol-reg24";

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

export type EediReportData = {
  title: string;
  generatedAt: string;
  phaseNote: string;
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
  return {
    name,
    value: String(value),
    description,
    status,
  };
}

function section(title: string, description = ""): ReportRow {
  return {
    name: title,
    value: "—",
    description,
    status: "section",
  };
}

function buildPreviewRows(
  formState: EediFormState,
  attained: EediBreakdown,
  compliance: ComplianceResult,
): ReportRow[] {
  const rows: ReportRow[] = [];

  rows.push(section("Formula inputs", "Denominator and correction factors."));
  rows.push(
    row("Capacity", `${formState.capacityT.toLocaleString("en-US")} t`, "Used in attained EEDI denominator", "preview"),
    row("V_ref", `${formState.vRef} kn`, "Reference speed", "preview"),
    row("f_i", formState.fi, "Capacity correction factor", "preview"),
    row("f_c", formState.fc, "Cubics correction factor", "preview"),
    row("f_l", formState.fl, "LNG tanker / ice-class factor", "preview"),
    row("f_w", formState.fw, "Weather factor", "preview"),
    row("Π f_j", formState.fjProd, "Product of individual f_j factors", "preview"),
    row("Π f_eff", formState.feff, "Product of innovative energy-efficiency factors", "preview"),
  );

  rows.push(section("Power"));
  rows.push(
    row(
      "Σ P_ME @ 75% MCR",
      `${attained.pMeItemsKw.reduce((a, b) => a + b, 0).toFixed(1)} kW`,
      "Sum of main-engine powers",
      "preview",
    ),
    row(
      "P_AE (used)",
      `${attained.pAeKw.toLocaleString("en-US", { maximumFractionDigits: 1 })} kW`,
      "Auxiliary power in formula",
      "preview",
    ),
  );

  rows.push(section("Attained EEDI"));
  rows.push(
    row(
      "Attained EEDI",
      `${attained.attainedEedi.toFixed(3)} gCO₂/t·nm`,
      "MEPC.308 §2.1 — live estimate from current inputs",
      "preview",
    ),
    row(
      "Numerator",
      attained.numeratorGco2PerH.toExponential(4),
      "g CO₂/h (with Πf_j × Πf_eff)",
      "preview",
    ),
    row(
      "Denominator",
      attained.denominatorTNmPerH.toExponential(4),
      "f_i × f_c × f_l × Capacity × V_ref × f_w",
      "preview",
    ),
  );

  rows.push(section("Required EEDI (Phase 3)"));
  if (compliance.referenceLineEedi != null) {
    rows.push(
      row(
        "Reference line EEDI",
        `${compliance.referenceLineEedi.toFixed(3)} gCO₂/t·nm`,
        "Regulation 24 Table 2",
        "preview",
      ),
    );
  }
  if (compliance.reductionPercent != null) {
    rows.push(
      row(
        "Reduction factor X",
        `${compliance.reductionPercent.toFixed(2)} %`,
        "Phase 3 (from 1 Jan 2025)",
        "preview",
      ),
    );
  }
  if (compliance.requiredEedi != null) {
    const pass = compliance.complies === true;
    const fail = compliance.complies === false;
    const status: ReportRowStatus = pass ? "pass" : fail ? "fail" : "preview";
    rows.push(
      row(
        "Required EEDI",
        `${compliance.requiredEedi.toFixed(3)} gCO₂/t·nm`,
        "Maximum permitted attained value",
        "preview",
      ),
      row(
        "Margin",
        `${(compliance.margin ?? 0) >= 0 ? "+" : ""}${(compliance.margin ?? 0).toFixed(3)} gCO₂/t·nm`,
        "Required − attained (positive = below limit)",
        status,
      ),
    );
  } else {
    rows.push(
      row(
        "Required EEDI",
        "n/a",
        "Not applicable for this size / phase",
        "neutral",
      ),
    );
  }

  return rows;
}

function buildResultsRows(
  attained: EediBreakdown,
  compliance: ComplianceResult,
): { rows: ReportRow[]; overallPass: boolean | null; overallLabel: string } {
  const rows: ReportRow[] = [];

  rows.push(section("Attained EEDI (MEPC.308 §2.1)"));
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

  rows.push(section("Required EEDI — Phase 3 (Reg. 24 / MEPC.328)"));

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

  return { rows, overallPass, overallLabel };
}

export function buildEediReport(
  formState: EediFormState,
  attained: EediBreakdown,
  compliance: ComplianceResult,
  shipName: string,
): EediReportData {
  const inputRows: ReportRow[] = [
    row("Ship / project", shipName || "—", "Project identifier", "input"),
    row(
      "Ship type",
      CATEGORY_LABELS[formState.regCategory],
      "Regulation 2 category",
      "input",
    ),
    ...collectEediParameters(formState).map((p) =>
      row(p.name, p.value, p.description, "input"),
    ),
  ];

  const { rows: resultsRows, overallPass, overallLabel } = buildResultsRows(
    attained,
    compliance,
  );

  const phases: ReportPhase[] = [
    {
      id: "input",
      title: "Input",
      description: "General, correction factors and propulsion / power generation.",
      rows: inputRows,
    },
    {
      id: "preview",
      title: "Preview",
      description: "Live attained EEDI and Phase 3 compliance estimate from current inputs.",
      rows: buildPreviewRows(formState, attained, compliance),
    },
    {
      id: "results",
      title: "Results",
      description: "Confirmed calculation after Calculate EEDI.",
      rows: resultsRows,
    },
  ];

  return {
    title: `EEDI Report — ${shipName || "Project"}`,
    generatedAt: new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    phaseNote:
      "Input · Preview · Results — same layout as the EEDI calculator. Phase 3 only (from 1 Jan 2025).",
    phases,
    overallPass,
    overallLabel,
  };
}
