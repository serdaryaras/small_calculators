import { computeEedi, type EediBreakdown } from "./calculation";
import type { EediFormState } from "./collect-parameters";
import { evaluateCompliance, type ComplianceResult, type ShipCategory } from "./marpol-reg24";

export type EediCalculationResult = {
  attained: EediBreakdown;
  compliance: ComplianceResult;
  warnings: string[];
};

export function validateEediForm(state: EediFormState): string[] {
  const errors: string[] = [];

  if (!state.vRef || state.vRef <= 0) {
    errors.push("V_ref must be greater than 0 (kn).");
  }

  if (!state.dwtInput || state.dwtInput <= 0) {
    errors.push("DWT must be greater than 0 (t).");
  }

  if (state.capMode === "gt") {
    if (!state.gtInput || state.gtInput <= 0) {
      errors.push("GT must be greater than 0 when Capacity definition is GT (option 3).");
    }
  }

  if (!state.capacityT || state.capacityT <= 0) {
    errors.push("Capacity used in the denominator must be greater than 0.");
  }

  if (!state.mainEngines.length) {
    errors.push("At least one main engine is required.");
  }

  state.mainEngines.forEach((me, i) => {
    if (!me.mcrKw || me.mcrKw <= 0) {
      errors.push(`Main engine ${i + 1}: MCR must be greater than 0 (kW).`);
    }
    if (!me.sfcGPerKwh || me.sfcGPerKwh <= 0) {
      errors.push(`Main engine ${i + 1}: SFC_ME must be greater than 0 (g/kWh).`);
    }
  });

  if (!state.sfcAe || state.sfcAe <= 0) {
    errors.push("SFC_AE must be greater than 0 (g/kWh).");
  }

  if (state.pAeOverride.trim()) {
    const parsed = parseFloat(state.pAeOverride.replace(",", "."));
    if (Number.isNaN(parsed) || parsed < 0) {
      errors.push("P_AE must be a valid non-negative number, or leave empty for auto.");
    }
  }

  const category = state.regCategory;

  if (category === "containership" && state.capMode !== "dwt_containership_70") {
    errors.push(
      "Containership: select Capacity definition option 2 (70% × DWT), not full DWT or GT.",
    );
  }

  if (
    category === "cruise_passenger_non_conventional" &&
    state.capMode !== "gt"
  ) {
    errors.push(
      "Cruise passenger (non-conventional): select Capacity definition option 3 (GT).",
    );
  }

  if (
    state.capMode === "gt" &&
    category !== "cruise_passenger_non_conventional" &&
    category !== "roro_vehicle"
  ) {
    errors.push(
      "GT as Capacity is only for cruise passenger (non-conventional) or when your class EEDI file specifies GT. Other cargo types normally use DWT (option 1) or 70% DWT for containerships.",
    );
  }

  if (category === "roro_vehicle") {
    const gt = state.regGt > 0 ? state.regGt : state.gtInput;
    if (!gt || gt <= 0) {
      errors.push(
        "Ro-ro vehicle carrier: enter GT under Reg. 24 (or use Capacity GT mode and enter GT).",
      );
    }
  }

  if (category === "cruise_passenger_non_conventional") {
    const gt = state.capMode === "gt" ? state.gtInput : state.regGt;
    if (!gt || gt <= 0) {
      errors.push("Cruise passenger ship: GT is required for reference line.");
    }
  }

  return errors;
}

function capacityWarnings(state: EediFormState): string[] {
  const w: string[] = [];
  const cat = state.regCategory;

  if (
    cat !== "containership" &&
    state.capMode === "dwt_containership_70"
  ) {
    w.push(
      "Capacity mode is 70% × DWT but ship type is not containership — verify this is intentional.",
    );
  }

  return w;
}

function resolveGtForCompliance(state: EediFormState): number | null {
  if (state.regCategory === "cruise_passenger_non_conventional") {
    if (state.capMode === "gt" && state.gtInput > 0) return state.gtInput;
    if (state.regGt > 0) return state.regGt;
    return null;
  }
  if (state.regCategory === "roro_vehicle") {
    if (state.regGt > 0) return state.regGt;
    if (state.capMode === "gt" && state.gtInput > 0) return state.gtInput;
    return null;
  }
  if (state.regGt > 0) return state.regGt;
  return null;
}

function parsePAeOverride(raw: string): number | null {
  if (!raw.trim()) return null;
  const parsed = parseFloat(raw.replace(",", "."));
  if (Number.isNaN(parsed)) {
    throw new Error("P_AE must be a valid number.");
  }
  return parsed;
}

export function calculateEediFromForm(state: EediFormState): EediCalculationResult {
  const validationErrors = validateEediForm(state);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join("\n"));
  }

  const warnings = capacityWarnings(state);
  const pAeVal = parsePAeOverride(state.pAeOverride);

  const attained = computeEedi({
    vRefKn: state.vRef,
    capacityT: state.capacityT,
    mainEngines: state.mainEngines,
    pAeKw: pAeVal,
    sfcAeGPerKwh: state.sfcAe,
    fuelAe: state.fuelAe,
    shaftGenerators: state.ptoKw.map((ratedElKw) => ({ ratedElKw })),
    shaftMotors: state.ptiKw.map((pPtiKw) => ({ pPtiKw })),
    innovativePeffKw: state.peff,
    innovativePaeEffKw: state.paeEff,
    fi: state.fi,
    fc: state.fc,
    fl: state.fl,
    fw: state.fw,
    fjProduct: state.fjProd,
    feffProduct: state.feff,
  });

  const compliance = evaluateCompliance(
    attained.attainedEedi,
    state.regCategory,
    state.dwtInput,
    resolveGtForCompliance(state),
    true,
  );

  return { attained, compliance, warnings };
}

/** Suggested capacity mode from Reg. 2 ship category */
export function suggestedCapacityMode(
  category: ShipCategory,
): EediFormState["capMode"] {
  if (category === "containership") return "dwt_containership_70";
  if (category === "cruise_passenger_non_conventional") return "gt";
  return "dwt";
}
