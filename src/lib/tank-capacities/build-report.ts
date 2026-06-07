import { FUEL_LABELS } from "@/lib/eedi/constants";
import { SERVICE_TANK_HOURS } from "./constants";
import { collectTankParameters } from "./collect-parameters";
import type { TankCapacitiesResult } from "./types";
import type { TankCapacitiesFormState } from "./validate-and-calculate";
import { INCINERATOR_CATEGORY_LABELS } from "./solid-waste";
import { wastewaterTankRateDescription } from "./wastewater";

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

export type TankCapacitiesReportData = {
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

function fmt(n: number, digits = 1): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function fmtDuration(days: number, hours: number): string {
  return `${fmt(days, 1)} days (${fmt(hours, 0)} h)`;
}

function buildPreviewRows(result: TankCapacitiesResult): ReportRow[] {
  const rows: ReportRow[] = [];

  rows.push(section("Time bases", "Derived periods from ship inputs."));
  rows.push(
    row(
      "Voyage duration",
      fmtDuration(result.voyageDays, result.voyageHours),
      "Range ÷ V_s — total fuel-oil quantity at range",
      "preview",
    ),
    row(
      "FW autonomy",
      fmtDuration(result.fwAutonomy.days, result.fwAutonomy.hours),
      result.fwAutonomy.source === "endurance"
        ? "From Endurance — fresh-water and solid-waste stowage period"
        : "Endurance is 0 — using voyage time (Range ÷ V_s)",
      "preview",
    ),
    row(
      "Sewage holding",
      fmtDuration(result.sewageHolding.days, result.sewageHolding.hours),
      "From Non-discharge period — holding-tank capacity",
      "preview",
    ),
  );

  rows.push(section("Wastewater & FW"));
  for (const tank of result.wastewater.tanks) {
    rows.push(
      row(
        `${tank.label} tank`,
        `${fmt(tank.dailyLiters, 0)} L/day (${fmt(tank.dailyM3, 2)} m³/day)`,
        tank.id === "gray"
          ? `Gray + laundry + galley — ${wastewaterTankRateDescription(tank, result.wastewater.personsOnBoard)}`
          : wastewaterTankRateDescription(tank, result.wastewater.personsOnBoard),
        "preview",
      ),
      row(
        `${tank.label} tank — holding`,
        `${fmt(tank.holdingLiters, 0)} L (${fmt(tank.holdingM3, 2)} m³)`,
        `Non-discharge period — ${fmt(result.sewageHolding.days, 1)} days`,
        "preview",
      ),
    );
    if (tank.id === "gray") {
      for (const component of tank.components) {
        rows.push(
          row(
            `  ${component.label}`,
            `${fmt(component.dailyLiters, 0)} L/day`,
            `${fmt(component.rateLPerPersonDay, 0)} L/person/day × ${result.wastewater.personsOnBoard} persons`,
            "neutral",
          ),
        );
      }
    }
  }
  rows.push(
    row(
      "Wastewater total",
      `${fmt(result.wastewater.totalDailyLiters, 0)} L/day (${fmt(result.wastewater.totalDailyM3, 2)} m³/day)`,
      "Black-water + gray-water tanks — daily generation",
      "preview",
    ),
    row(
      "Holding total",
      `${fmt(result.wastewater.totalHoldingLiters, 0)} L (${fmt(result.wastewater.totalHoldingM3, 2)} m³)`,
      `Black + gray tanks over non-discharge period (${fmt(result.sewageHolding.days, 1)} days)`,
      "preview",
    ),
    row(
      "FW daily demand",
      `${fmt(result.freshWater.dailyLiters, 0)} L/day (${fmt(result.freshWater.dailyM3, 2)} m³/day)`,
      "Equals total daily wastewater",
      "preview",
    ),
    row(
      "FW tank capacity",
      `${fmt(result.freshWater.tankLiters, 0)} L (${fmt(result.freshWater.tankM3, 2)} m³)`,
      `Daily FW × FW autonomy (${fmt(result.fwAutonomy.days, 1)} days)`,
      "preview",
    ),
  );

  rows.push(section("Solid waste"));
  const solidNote = [
    `Stowage over FW autonomy (${fmt(result.solidWaste.period.days, 1)} days).`,
    result.solidWaste.withCompactor ? "Compactor in use." : "",
    result.solidWaste.incinerator
      ? `Incinerator: ${INCINERATOR_CATEGORY_LABELS} volume × 0.6.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  rows.push(row("Note", "—", solidNote, "neutral"));

  for (const cat of result.solidWaste.categories) {
    rows.push(
      row(
        cat.label,
        `${fmt(cat.dailyMassKg, 1)} kg/day · ${fmt(cat.dailyVolumeM3, 1)} m³/day`,
        `${fmt(cat.rateKgPerPersonDay, 1)} kg/person/day × ${result.solidWaste.personsOnBoard} persons`,
        "preview",
      ),
      row(
        `${cat.label} — stowage`,
        `${fmt(cat.voyageMassKg, 1)} kg · ${fmt(cat.voyageVolumeM3, 1)} m³`,
        `Over endurance period (${fmt(result.solidWaste.period.days, 1)} days)`,
        "preview",
      ),
    );
  }

  return rows;
}

function buildResultsRows(
  result: TankCapacitiesResult,
  warnings: string[],
): { rows: ReportRow[]; overallPass: boolean | null; overallLabel: string } {
  const rows: ReportRow[] = [];

  rows.push(section(`Results — summary`));
  rows.push(
    row(
      "Voyage duration",
      fmtDuration(result.voyageDays, result.voyageHours),
      "Time to cover design range at service speed",
      "result",
    ),
    row(
      "Total fuel (all grades)",
      `${fmt(result.totalFuelMassKg / 1000, 1)} t · ${fmt(result.totalFuelVolumeM3, 1)} m³`,
      "Sum of fuel oil required for the range voyage",
      "result",
    ),
    row(
      "FW autonomy",
      fmtDuration(result.fwAutonomy.days, result.fwAutonomy.hours),
      result.fwAutonomy.source === "endurance"
        ? "From Endurance — fresh-water tank sizing period"
        : "From Range ÷ V_s (Endurance not set) — fresh-water tank sizing period",
      "result",
    ),
    row(
      "Sewage holding period",
      fmtDuration(result.sewageHolding.days, result.sewageHolding.hours),
      "From Non-discharge period — holding-tank sizing period",
      "result",
    ),
  );

  rows.push(section("Fresh water"));
  rows.push(
    row(
      "FW daily demand",
      `${fmt(result.freshWater.dailyLiters, 0)} L/day (${fmt(result.freshWater.dailyM3, 2)} m³/day)`,
      "Equals total daily wastewater generation",
      "result",
    ),
    row(
      "FW tank capacity",
      `${fmt(result.freshWater.tankLiters, 0)} L (${fmt(result.freshWater.tankM3, 2)} m³)`,
      result.fwAutonomy.source === "endurance"
        ? `Daily FW × Endurance (${fmt(result.fwAutonomy.days, 1)} days)`
        : `Daily FW × voyage time (${fmt(result.fwAutonomy.days, 1)} days — Endurance not set)`,
      "result",
    ),
  );

  for (const tank of result.wastewater.tanks) {
    const tankNo = tank.id === "black" ? "Tank 1" : "Tank 2";
    rows.push(section(`${tankNo} — ${tank.label} tank`));
    rows.push(
      row(
        "Daily generation",
        `${fmt(tank.dailyLiters, 0)} L/day (${fmt(tank.dailyM3, 2)} m³/day)`,
        tank.id === "gray"
          ? `Gray + laundry + galley — ${wastewaterTankRateDescription(tank, result.wastewater.personsOnBoard)}`
          : wastewaterTankRateDescription(tank, result.wastewater.personsOnBoard),
        "result",
      ),
      row(
        "Holding capacity",
        `${fmt(tank.holdingLiters, 0)} L (${fmt(tank.holdingM3, 2)} m³)`,
        `This tank only — non-discharge period ${fmt(result.sewageHolding.days, 1)} days`,
        "result",
      ),
    );
    if (tank.id === "gray") {
      for (const component of tank.components) {
        rows.push(
          row(
            `  ${component.label}`,
            `${fmt(component.dailyLiters, 0)} L/day`,
            `${fmt(component.rateLPerPersonDay, 0)} L/person/day × ${result.wastewater.personsOnBoard} persons`,
            "neutral",
          ),
        );
      }
    }
  }

  rows.push(section("Wastewater — combined total"));
  rows.push(
    row(
      "Wastewater total",
      `${fmt(result.wastewater.totalDailyLiters, 0)} L/day (${fmt(result.wastewater.totalDailyM3, 2)} m³/day)`,
      "Black-water tank + gray-water tank — not a third tank",
      "result",
    ),
    row(
      "Holding total",
      `${fmt(result.wastewater.totalHoldingLiters, 0)} L (${fmt(result.wastewater.totalHoldingM3, 2)} m³)`,
      "Sum of the two separate holding tanks",
      "result",
    ),
  );

  rows.push(section("Solid waste — stowage"));
  rows.push(
    row(
      "Endurance basis",
      fmtDuration(result.solidWaste.period.days, result.solidWaste.period.hours),
      result.solidWaste.period.source === "endurance"
        ? "From Endurance — solid-waste stowage period"
        : "From Range ÷ V_s (Endurance not set) — solid-waste stowage period",
      "result",
    ),
    row(
      "Bulk density mode",
      result.solidWaste.withCompactor ? "With compactor" : "No compactor",
      "Stowage ρ for plastic and glass",
      "neutral",
    ),
    row(
      "Solid-waste incinerator",
      result.solidWaste.incinerator ? "Yes" : "No",
      result.solidWaste.incinerator
        ? `${INCINERATOR_CATEGORY_LABELS} volume × 0.6`
        : "No volume reduction applied",
      "neutral",
    ),
  );

  for (const cat of result.solidWaste.categories) {
    rows.push(
      row(
        cat.label,
        `${fmt(cat.dailyMassKg, 1)} kg/day · ${fmt(cat.dailyVolumeM3, 1)} m³/day`,
        `${fmt(cat.rateKgPerPersonDay, 1)} kg/person/day × ${result.solidWaste.personsOnBoard} persons`,
        "result",
      ),
      row(
        `${cat.label} — stowage`,
        `${fmt(cat.voyageMassKg, 1)} kg · ${fmt(cat.voyageVolumeM3, 1)} m³`,
        `Over endurance period (${fmt(result.solidWaste.period.days, 1)} days)`,
        "result",
      ),
    );
  }

  rows.push(section("Total fuel oil — by fuel type"));
  for (const fuelRow of result.rangeFuelByType) {
    rows.push(
      row(
        FUEL_LABELS[fuelRow.fuel],
        `${fmt(fuelRow.massKg / 1000, 2)} t · ${fmt(fuelRow.volumeM3, 1)} m³`,
        `Range voyage — ${fmt(result.voyageHours, 0)} h at V_s`,
        "result",
      ),
    );
    for (const c of fuelRow.consumers) {
      rows.push(
        row(
          `  ${c.label}`,
          `${fmt(c.massKg / 1000, 2)} t`,
          "Consumer contribution",
          "neutral",
        ),
      );
    }
  }

  rows.push(section(`Fuel service tanks (≥ ${SERVICE_TANK_HOURS} h)`));

  let anyChecked = false;
  let allPass = true;
  let anyFail = false;

  for (const st of result.serviceTanks) {
    rows.push(
      row(
        `${FUEL_LABELS[st.fuel]} — minimum`,
        `${fmt(st.minVolumeM3, 2)} m³`,
        `${SERVICE_TANK_HOURS} h consumption: ${fmt(st.massKg8h / 1000, 2)} t`,
        "result",
      ),
    );
    if (st.designVolumeM3 != null) {
      anyChecked = true;
      const pass = st.meetsRequirement === true;
      const fail = st.meetsRequirement === false;
      if (fail) anyFail = true;
      if (!pass) allPass = false;
      const status: ReportRowStatus = pass ? "pass" : fail ? "fail" : "neutral";
      rows.push(
        row(
          `${FUEL_LABELS[st.fuel]} — design volume`,
          `${fmt(st.designVolumeM3, 2)} m³${pass ? " ✓" : fail ? " ✗" : ""}`,
          pass
            ? "Meets the 8-hour minimum"
            : fail
              ? "Below the 8-hour minimum"
              : "Design service-tank volume",
          status,
        ),
      );
    }
  }

  for (const w of warnings) {
    rows.push(row("Warning", w, "Design check", "fail"));
  }

  let overallPass: boolean | null = null;
  let overallLabel = "Calculation complete — review fuel and service-tank results";

  if (anyChecked) {
    overallPass = allPass && !anyFail;
    overallLabel = overallPass
      ? `PASS — all design service tanks meet the ${SERVICE_TANK_HOURS} h minimum`
      : `FAIL — one or more service tanks are below the ${SERVICE_TANK_HOURS} h minimum`;
  } else if (warnings.length > 0) {
    overallPass = false;
    overallLabel = "FAIL — service-tank warnings (see table)";
  }

  return { rows, overallPass, overallLabel };
}

export function buildTankCapacitiesReport(
  form: TankCapacitiesFormState,
  result: TankCapacitiesResult,
  warnings: string[],
  shipName: string,
): TankCapacitiesReportData {
  const inputRows: ReportRow[] = collectTankParameters(form).map((p) =>
    row(p.name, p.value, p.description, "input"),
  );

  const { rows: resultsRows, overallPass, overallLabel } = buildResultsRows(
    result,
    warnings,
  );

  const phases: ReportPhase[] = [
    {
      id: "input",
      title: "Input",
      description: "Ship, machinery and fuel properties.",
      rows: inputRows,
    },
    {
      id: "preview",
      title: "Preview",
      description: "Live estimates from input parameters.",
      rows: buildPreviewRows(result),
    },
    {
      id: "results",
      title: "Results",
      description: "Full calculation — fuel at range and service-tank checks.",
      rows: resultsRows,
    },
  ];

  return {
    title: `Tank Capacities Report — ${shipName || "Project"}`,
    generatedAt: new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    summaryNote:
      "Input · Preview · Results — same layout as the Tank Capacities calculator.",
    phases,
    overallPass,
    overallLabel,
  };
}
