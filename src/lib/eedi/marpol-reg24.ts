/**
 * MARPOL Annex VI Regulation 24 — Required EEDI vs reference line (MEPC.328(76)).
 * This hub uses Phase 3 (from 1 Jan 2025) only.
 */

export type ShipCategory =
  | "bulk_carrier"
  | "combination_carrier"
  | "containership"
  | "cruise_passenger_non_conventional"
  | "gas_carrier"
  | "general_cargo"
  | "lng_carrier"
  | "refrigerated_cargo"
  | "roro_cargo"
  | "roro_vehicle"
  | "roro_passenger"
  | "tanker";

export const REGULATORY_PHASE = "phase_3_2025" as const;

type RegulatoryPhase =
  | "phase_1"
  | "phase_2_2024"
  | "phase_3_2022"
  | typeof REGULATORY_PHASE;

export type ComplianceResult = {
  attainedEedi: number;
  referenceLineEedi: number | null;
  reductionPercent: number | null;
  requiredEedi: number | null;
  complies: boolean | null;
  margin: number | null;
  messages: string[];
};

export const CATEGORY_LABELS: Record<ShipCategory, string> = {
  bulk_carrier: "Bulk carrier",
  tanker: "Tanker",
  gas_carrier: "Gas carrier",
  containership: "Containership",
  general_cargo: "General cargo ship",
  refrigerated_cargo: "Refrigerated cargo carrier",
  combination_carrier: "Combination carrier",
  lng_carrier: "LNG carrier",
  roro_cargo: "Ro-ro cargo ship",
  roro_vehicle: "Ro-ro cargo ship (vehicle carrier)",
  roro_passenger: "Ro-ro passenger ship",
  cruise_passenger_non_conventional:
    "Cruise passenger ship (non-conventional propulsion)",
};

export const SHIP_CATEGORIES = Object.keys(CATEGORY_LABELS) as ShipCategory[];

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function linInterp(
  dwt: number,
  d0: number,
  d1: number,
  x0: number,
  x1: number,
): number {
  if (d1 <= d0) return x1;
  const t = clamp((dwt - d0) / (d1 - d0), 0, 1);
  return x0 + t * (x1 - x0);
}

function x4(
  phase: RegulatoryPhase,
  xP1: number,
  xP2: number,
  xP3a: number,
  xP3b: number,
): number {
  const m: Record<RegulatoryPhase, number> = {
    phase_1: xP1,
    phase_2_2024: xP2,
    phase_3_2022: xP3a,
    phase_3_2025: xP3b,
  };
  return m[phase];
}

export function referenceLineEedi(
  category: ShipCategory,
  dwtT: number,
  gt: number | null,
  usePostPhase2LineParams = true,
): number {
  const dwt = Math.max(dwtT, 1);

  switch (category) {
    case "bulk_carrier": {
      const b = Math.min(dwt, 279_000);
      return 961.79 * b ** -0.477;
    }
    case "combination_carrier":
      return 1219.0 * dwt ** -0.488;
    case "containership":
      return 174.22 * dwt ** -0.201;
    case "cruise_passenger_non_conventional": {
      if (!gt || gt <= 0) {
        throw new Error("Gross tonnage (GT) is required for cruise passenger ships.");
      }
      return 170.84 * gt ** -0.214;
    }
    case "gas_carrier":
      return 1120.0 * dwt ** -0.456;
    case "general_cargo":
      return 107.48 * dwt ** -0.216;
    case "lng_carrier":
      return 2253.7 * dwt ** -0.474;
    case "refrigerated_cargo":
      return 227.01 * dwt ** -0.244;
    case "roro_cargo": {
      const a = usePostPhase2LineParams ? 1686.17 : 1405.15;
      const b = Math.min(dwt, 17_000);
      return a * b ** -0.498;
    }
    case "roro_vehicle": {
      if (!gt || gt <= 0) {
        throw new Error(
          "GT is required for ro-ro cargo ship (vehicle carrier) reference line.",
        );
      }
      const ratio = dwt / gt;
      const a = ratio < 0.3 ? ratio ** -0.7 * 780.36 : 1812.63;
      return a * dwt ** -0.471;
    }
    case "roro_passenger": {
      const a = usePostPhase2LineParams ? 902.59 : 752.16;
      const b = Math.min(dwt, 10_000);
      return a * b ** -0.381;
    }
    case "tanker":
      return 1218.8 * dwt ** -0.488;
    default:
      throw new Error(`Unsupported category: ${category}`);
  }
}

export function reductionFactorPercent(
  category: ShipCategory,
  dwtT: number,
  gt: number | null,
  phase: RegulatoryPhase = REGULATORY_PHASE,
): number | null {
  const d = dwtT;
  const g = gt ?? 0;

  const colBulk = (dwt_: number): number | null => {
    if (dwt_ >= 20_000) return x4(phase, 10, 20, 30, 30);
    if (dwt_ >= 10_000) {
      if (phase === "phase_1") return linInterp(dwt_, 10_000, 20_000, 0, 10);
      if (phase === "phase_2_2024") return linInterp(dwt_, 10_000, 20_000, 0, 20);
      return linInterp(dwt_, 10_000, 20_000, 0, 30);
    }
    return null;
  };

  const colGas = (dwt_: number): number | null => {
    if (dwt_ >= 15_000) return x4(phase, 10, 20, 30, 30);
    if (dwt_ >= 10_000) return x4(phase, 10, 20, 30, 30);
    if (dwt_ >= 2_000) {
      if (phase === "phase_1") return linInterp(dwt_, 2_000, 10_000, 0, 10);
      if (phase === "phase_2_2024") return linInterp(dwt_, 2_000, 10_000, 0, 20);
      return linInterp(dwt_, 2_000, 10_000, 0, 30);
    }
    return null;
  };

  const colTanker = (dwt_: number): number | null => {
    if (dwt_ >= 20_000) return x4(phase, 10, 20, 30, 30);
    if (dwt_ >= 4_000) {
      if (phase === "phase_1") return linInterp(dwt_, 4_000, 20_000, 0, 10);
      if (phase === "phase_2_2024") return linInterp(dwt_, 4_000, 20_000, 0, 20);
      return linInterp(dwt_, 4_000, 20_000, 0, 30);
    }
    return null;
  };

  const colContainer = (dwt_: number): number | null => {
    if (dwt_ >= 200_000) return x4(phase, 10, 20, 50, 50);
    if (dwt_ >= 120_000) return x4(phase, 10, 20, 45, 45);
    if (dwt_ >= 80_000) return x4(phase, 10, 20, 40, 40);
    if (dwt_ >= 40_000) return x4(phase, 10, 20, 35, 35);
    if (dwt_ >= 15_000) return x4(phase, 10, 20, 30, 30);
    if (dwt_ >= 10_000) {
      if (phase === "phase_1") return linInterp(dwt_, 10_000, 15_000, 0, 10);
      if (phase === "phase_2_2024") return linInterp(dwt_, 10_000, 15_000, 0, 20);
      if (phase === "phase_3_2022") return linInterp(dwt_, 10_000, 15_000, 15, 30);
      return linInterp(dwt_, 10_000, 15_000, 15, 30);
    }
    return null;
  };

  const colGeneral = (dwt_: number): number | null => {
    if (dwt_ >= 15_000) return x4(phase, 10, 15, 30, 30);
    if (dwt_ >= 3_000) {
      if (phase === "phase_1") return linInterp(dwt_, 3_000, 15_000, 0, 10);
      if (phase === "phase_2_2024") return linInterp(dwt_, 3_000, 15_000, 0, 15);
      return linInterp(dwt_, 3_000, 15_000, 0, 30);
    }
    return null;
  };

  const colRefrozen = (
    dwt_: number,
    hi = 5_000,
    midLow = 3_000,
  ): number | null => {
    if (dwt_ >= hi) return x4(phase, 10, 15, 30, 30);
    if (dwt_ >= midLow) {
      if (phase === "phase_1") return linInterp(dwt_, midLow, hi, 0, 10);
      if (phase === "phase_2_2024") return linInterp(dwt_, midLow, hi, 0, 15);
      return linInterp(dwt_, midLow, hi, 0, 30);
    }
    return null;
  };

  const colCombo = (dwt_: number): number | null => {
    if (dwt_ >= 20_000) return x4(phase, 10, 20, 30, 30);
    if (dwt_ >= 4_000) {
      if (phase === "phase_1") return linInterp(dwt_, 4_000, 20_000, 0, 10);
      if (phase === "phase_2_2024") return linInterp(dwt_, 4_000, 20_000, 0, 20);
      return linInterp(dwt_, 4_000, 20_000, 0, 30);
    }
    return null;
  };

  const colLng = (dwt_: number): number | null => {
    if (dwt_ >= 10_000) return x4(phase, 10, 20, 30, 30);
    return null;
  };

  const colRoroVehicle = (dwt_: number): number | null => {
    if (dwt_ >= 10_000) return x4(phase, 5, 15, 30, 30);
    return null;
  };

  const colRoroCargo = (dwt_: number): number | null => {
    if (dwt_ >= 2_000) return x4(phase, 5, 20, 30, 30);
    if (dwt_ >= 1_000) {
      if (phase === "phase_1") return linInterp(dwt_, 1_000, 2_000, 0, 5);
      if (phase === "phase_2_2024") return linInterp(dwt_, 1_000, 2_000, 0, 20);
      return linInterp(dwt_, 1_000, 2_000, 0, 30);
    }
    return null;
  };

  const colRoroPax = (dwt_: number): number | null => {
    if (dwt_ >= 1_000) return x4(phase, 5, 20, 30, 30);
    if (dwt_ >= 250) {
      if (phase === "phase_1") return linInterp(dwt_, 250, 1_000, 0, 5);
      if (phase === "phase_2_2024") return linInterp(dwt_, 250, 1_000, 0, 20);
      return linInterp(dwt_, 250, 1_000, 0, 30);
    }
    return null;
  };

  const colCruise = (gt_: number): number | null => {
    if (gt_ >= 85_000) return x4(phase, 5, 20, 30, 30);
    if (gt_ >= 25_000) {
      if (phase === "phase_1") return linInterp(gt_, 25_000, 85_000, 0, 5);
      if (phase === "phase_2_2024") return linInterp(gt_, 25_000, 85_000, 0, 20);
      return linInterp(gt_, 25_000, 85_000, 0, 30);
    }
    return null;
  };

  switch (category) {
    case "bulk_carrier":
      return colBulk(d);
    case "gas_carrier":
      return colGas(d);
    case "tanker":
      return colTanker(d);
    case "containership":
      return colContainer(d);
    case "general_cargo":
      return colGeneral(d);
    case "refrigerated_cargo":
      return colRefrozen(d);
    case "combination_carrier":
      return colCombo(d);
    case "lng_carrier":
      return colLng(d);
    case "roro_vehicle":
      return colRoroVehicle(d);
    case "roro_cargo":
      return colRoroCargo(d);
    case "roro_passenger":
      return colRoroPax(d);
    case "cruise_passenger_non_conventional":
      return g > 0 ? colCruise(g) : null;
    default:
      return null;
  }
}

export function requiredEediValue(
  category: ShipCategory,
  dwtT: number,
  gt: number | null,
  usePostPhase2LineParams = true,
): { required: number | null; reference: number | null; messages: string[] } {
  const msgs: string[] = [];
  const x = reductionFactorPercent(category, dwtT, gt, REGULATORY_PHASE);

  if (x === null) {
    msgs.push(
      "No mandatory required EEDI for this ship size in Phase 3 (from 1 Jan 2025) (n/a band). Verify with the Administration.",
    );
    try {
      const ref = referenceLineEedi(category, dwtT, gt, usePostPhase2LineParams);
      return { required: null, reference: ref, messages: msgs };
    } catch (e) {
      msgs.push(e instanceof Error ? e.message : String(e));
      return { required: null, reference: null, messages: msgs };
    }
  }

  try {
    const ref = referenceLineEedi(category, dwtT, gt, usePostPhase2LineParams);
    return { required: (1 - x / 100) * ref, reference: ref, messages: msgs };
  } catch (e) {
    msgs.push(e instanceof Error ? e.message : String(e));
    return { required: null, reference: null, messages: msgs };
  }
}

export function evaluateCompliance(
  attainedEedi: number,
  category: ShipCategory,
  dwtT: number,
  gt: number | null,
  usePostPhase2LineParams = true,
): ComplianceResult {
  const { required, reference, messages } = requiredEediValue(
    category,
    dwtT,
    gt,
    usePostPhase2LineParams,
  );

  if (required === null) {
    return {
      attainedEedi,
      referenceLineEedi: reference,
      reductionPercent: null,
      requiredEedi: null,
      complies: null,
      margin: null,
      messages,
    };
  }

  const margin = required - attainedEedi;
  const x = reductionFactorPercent(category, dwtT, gt, REGULATORY_PHASE);
  return {
    attainedEedi,
    referenceLineEedi: reference,
    reductionPercent: x,
    requiredEedi: required,
    complies: attainedEedi <= required + 1e-9,
    margin,
    messages,
  };
}
