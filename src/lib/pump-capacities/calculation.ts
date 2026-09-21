import {
  BILGE_BRANCH_D_COEFF,
  BILGE_BRANCH_D_TERM,
  BILGE_BRANCH_MIN_MM,
  BILGE_MAIN_D_COEFF,
  BILGE_MAIN_D_TERM,
  BILGE_MAIN_FORMULA_SLACK_MM,
  BILGE_MAIN_MIN_MM,
  BILGE_Q_COEFF_SHORT,
  BILGE_Q_COEFF_STANDARD,
  BV_RULE_REF,
  COMMERCIAL_DN,
  EMERGENCY_FIRE_FRACTION,
  EMERGENCY_FIRE_MIN_M3H,
  FIRE_PUMP_EACH_FRACTION,
  FIRE_PUMP_MIN_EACH_M3H,
  FIRE_TOTAL_CAP_CARGO_M3H,
  MONITOR_BREADTH_THRESHOLD_M,
  MONITOR_CAPACITY_M3H,
  PASSENGER_NUMERAL_EXTRA_PUMP,
  PASSENGER_NUMERAL_K_COEFF,
  SHORT_SHIP_LENGTH_M,
  TANKER_MAIN_D_COEFF,
  TANKER_MAIN_D_TERM,
  VT1_LABELS,
  VT2_LABELS,
} from "./constants";
import type {
  BilgeBranchInput,
  BilgeResult,
  BranchResult,
  FireResult,
  PassengerNumeralInfo,
  PumpCapacitiesInput,
  PumpCapacitiesResult,
  ShipType,
  Vt1,
  Vt2,
} from "./types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function branchDiameterMm(
  L1: number,
  B: number,
  D: number,
): { raw: number; rule: number } | null {
  if (!(L1 > 0) || !(B > 0) || !(D > 0)) return null;
  const raw = BILGE_BRANCH_D_TERM + BILGE_BRANCH_D_COEFF * Math.sqrt(L1 * (B + D));
  return { raw, rule: Math.max(BILGE_BRANCH_MIN_MM, raw) };
}

export function mainDiameterGeneralMm(L: number, B: number, D: number): number | null {
  if (!(L > 0) || !(B > 0) || !(D > 0)) return null;
  return BILGE_MAIN_D_TERM + BILGE_MAIN_D_COEFF * Math.sqrt(L * (B + D));
}

export function mainDiameterTankerMm(L0: number, B: number, D: number): number | null {
  if (!(L0 > 0) || !(B > 0) || !(D > 0)) return null;
  return TANKER_MAIN_D_TERM + TANKER_MAIN_D_COEFF * Math.sqrt(L0 * (B + D));
}

export function bilgePumpCapacityM3H(
  dMm: number,
  shipType: ShipType,
  lengthM: number,
): number | null {
  if (!(dMm > 0)) return null;
  if (shipType === "cargo" && lengthM < SHORT_SHIP_LENGTH_M) {
    return BILGE_Q_COEFF_SHORT * dMm * dMm;
  }
  return BILGE_Q_COEFF_STANDARD * dMm * dMm;
}

export function recommendDn(dMinMm: number): number | null {
  if (!(dMinMm > 0)) return null;
  return (
    COMMERCIAL_DN.find((dn) => dn >= dMinMm - 1e-9) ??
    COMMERCIAL_DN[COMMERCIAL_DN.length - 1]
  );
}

export function passengerNumeral(input: {
  L: number;
  M: number;
  P: number;
  V: number;
  N: number;
  Pabove: number;
}): PassengerNumeralInfo | null {
  const { L, M, P, V, N, Pabove } = input;
  if (!(L > 0) || !(V > 0)) return null;
  const K = PASSENGER_NUMERAL_K_COEFF * L;
  const kn = K * (N || 0);
  const pAbove = Pabove || 0;
  const pBelow = P || 0;
  let P1 = kn;
  if (kn > pBelow + pAbove) {
    P1 = Math.max(pBelow + pAbove, (2 / 3) * kn);
  }
  let numeral: number;
  if (P1 > pBelow) {
    const den = V + P1 - pBelow;
    if (den <= 0) return null;
    numeral = (72 * (M + 2 * P1)) / den;
  } else {
    numeral = (72 * (M + 2 * pBelow)) / V;
  }
  return { K, P1, numeral };
}

export function defaultVt1(shipType: ShipType, gt: number): Vt1 {
  if (shipType === "passenger") return gt >= 4000 ? 1 : 2;
  return gt >= 1000 ? 3 : 4;
}

export function defaultVt2(shipType: ShipType, fiveTiers: boolean): Vt2 {
  if (fiveTiers) return 3;
  return shipType === "passenger" ? 1 : 2;
}

function firePumpNumber(vt1: Vt1): number {
  return vt1 === 1 ? 3 : 2;
}

function hydrantPressure(shipType: ShipType, gt: number): number {
  if (shipType === "passenger") return gt >= 4000 ? 0.4 : 0.3;
  return gt >= 6000 ? 0.27 : 0.25;
}

export function computeFireRequirements(input: PumpCapacitiesInput): FireResult {
  const { shipType, lengthM, breadthM, depthM, grossTonnage, fiveTiers, firePumpsEqual } =
    input;

  const vt1 = input.vt1 ?? defaultVt1(shipType, grossTonnage);
  const vt2 = input.vt2 ?? defaultVt2(shipType, fiveTiers);
  const pumps = firePumpNumber(vt1);

  const dBilge = mainDiameterGeneralMm(lengthM, breadthM, depthM)!;
  const Qbilge = BILGE_Q_COEFF_STANDARD * dBilge * dBilge;

  let Qtotal: number;
  let capNote = "";
  let monitors = 0;

  if (vt2 === 1) {
    Qtotal = (2 / 3) * Qbilge;
    capNote =
      "Passenger: 2/3 of the bilge-pump capacity of a ship of the same dimensions.";
  } else if (vt2 === 3) {
    monitors = breadthM < MONITOR_BREADTH_THRESHOLD_M ? 2 : 4;
    const Qmon = monitors * MONITOR_CAPACITY_M3H;
    const Qcargo = Math.min(FIRE_TOTAL_CAP_CARGO_M3H, (4 / 3) * Qbilge);
    Qtotal = Math.max(Qcargo, Qmon);
    capNote =
      "5+ container tiers: total ≥ cargo rule and ≥ mobile water monitors (2 if B<30 m, else 4) at 60 m³/h each. The 180 m³/h cargo cap does not limit the monitor supply.";
  } else {
    Qtotal = Math.min(FIRE_TOTAL_CAP_CARGO_M3H, (4 / 3) * Qbilge);
    capNote =
      "Cargo: 4/3 of each independent bilge pump of a passenger ship of the same dimensions, not more than 180 m³/h.";
  }

  Qtotal = round1(Qtotal);
  const Qeach = round1(Math.max(FIRE_PUMP_MIN_EACH_M3H, Qtotal / pumps));
  const QeachAsym = round1(
    Math.max(FIRE_PUMP_MIN_EACH_M3H, (FIRE_PUMP_EACH_FRACTION * Qtotal) / pumps),
  );
  const emergencyRequired = shipType !== "passenger" && grossTonnage >= 1000;
  const Qemergency = emergencyRequired
    ? round1(Math.max(EMERGENCY_FIRE_MIN_M3H, EMERGENCY_FIRE_FRACTION * Qtotal))
    : null;

  return {
    vt1,
    vt2,
    vt1Label: VT1_LABELS[vt1],
    vt2Label: VT2_LABELS[vt2],
    pumpCount: pumps,
    dBilgeRefMm: round1(dBilge),
    qBilgeRefM3H: round1(Qbilge),
    totalRequiredM3H: Qtotal,
    equalEachM3H: Qeach,
    asymmetricEachM3H: QeachAsym,
    firePumpsEqual,
    emergencyRequired,
    emergencyM3H: Qemergency,
    hydrantPressureNMm2: hydrantPressure(shipType, grossTonnage),
    monitors,
    capNote,
  };
}

function mapBranch(
  row: BilgeBranchInput,
  index: number,
  Bship: number,
  Bmain: number,
  D: number,
): BranchResult {
  const label = row.label.trim() || `Compartment ${index + 1}`;
  const Bbranch = row.isMachinery ? Bship : Bmain;
  const calc = branchDiameterMm(row.lengthM, Bbranch, D);
  return {
    label,
    lengthM: row.lengthM,
    isMachinery: row.isMachinery,
    d1RawMm: calc ? round1(calc.raw) : null,
    d1Mm: calc ? round1(calc.rule) : null,
    valid: Boolean(calc),
  };
}

export function computeBilgeRequirements(input: PumpCapacitiesInput): BilgeResult {
  const {
    shipType,
    lengthM,
    breadthM,
    depthM,
    useHoldBreadth,
    holdBreadthAmidshipsM,
    engineRoomLengthM,
  } = input;

  const useHold =
    useHoldBreadth &&
    shipType === "cargo" &&
    holdBreadthAmidshipsM != null &&
    holdBreadthAmidshipsM > 0;
  const Bmain = useHold ? holdBreadthAmidshipsM! : breadthM;
  const L0 = engineRoomLengthM;

  const branches = input.branches.map((row, i) =>
    mapBranch(row, i, breadthM, Bmain, depthM),
  );
  const validBranches = branches.filter((b) => b.valid && b.d1Mm != null);
  const maxBranch = validBranches.reduce((m, b) => Math.max(m, b.d1Mm!), 0);

  let machineryBranch: BranchResult | null =
    validBranches.find((b) => b.isMachinery) ?? null;

  if (!machineryBranch && shipType === "tanker" && L0 != null && L0 > 0) {
    const calc = branchDiameterMm(L0, breadthM, depthM)!;
    machineryBranch = {
      label: "Engine room (L₀)",
      lengthM: L0,
      isMachinery: true,
      d1RawMm: round1(calc.raw),
      d1Mm: round1(calc.rule),
      valid: true,
      synthetic: true,
    };
  }

  let dFormula: number;
  let dTwice: number | null = null;
  let dRule: number;
  let formulaNote: string;
  let ruleRef: string;

  if (shipType === "tanker") {
    dFormula = mainDiameterTankerMm(L0!, breadthM, depthM)!;
    const d1m =
      machineryBranch?.d1Mm ??
      branchDiameterMm(L0!, breadthM, depthM)!.rule;
    dTwice = d1m * Math.SQRT2;
    dRule = Math.max(dFormula, dTwice);
    formulaNote = `d = max(35 + 3√(L₀·(B+D)), d₁√2) — L₀ = ${L0} m`;
    ruleRef = "BV NR467 Pt D, Ch 7, Sec 4 [2.2.2] · Pt C [6.8.9]";
  } else {
    dFormula = mainDiameterGeneralMm(lengthM, Bmain, depthM)!;
    dRule = dFormula;
    formulaNote = useHold
      ? `d = 25 + 1.68√(L·(B_hold+D)) — B_hold = ${Bmain} m`
      : `d = 25 + 1.68√(L·(B+D))`;
    ruleRef = "BV NR467 Pt C, Ch 1, Sec 10 [6.8.1]";
  }

  const dMinActual = Math.max(
    dRule - BILGE_MAIN_FORMULA_SLACK_MM,
    BILGE_MAIN_MIN_MM,
    maxBranch,
  );
  const Q = bilgePumpCapacityM3H(dRule, shipType, lengthM)!;
  const reducedQ = shipType === "cargo" && lengthM < SHORT_SHIP_LENGTH_M;
  const compensationAllowed = shipType !== "passenger";
  const QminOne = compensationAllowed ? Q * 0.7 : Q;

  let pumps: number;
  let extraNote: string;
  let numeralInfo: PassengerNumeralInfo | null = null;

  if (shipType === "passenger") {
    const raw = passengerNumeral({
      L: lengthM,
      M: input.passengerM,
      P: input.passengerP,
      V: input.passengerV,
      N: input.passengerN,
      Pabove: input.passengerPAbove,
    });
    numeralInfo = raw
      ? {
          K: round2(raw.K),
          P1: round1(raw.P1),
          numeral: round1(raw.numeral),
        }
      : null;
    pumps = numeralInfo && numeralInfo.numeral >= PASSENGER_NUMERAL_EXTRA_PUMP ? 4 : 3;
    extraNote =
      numeralInfo && numeralInfo.numeral >= PASSENGER_NUMERAL_EXTRA_PUMP
        ? "Bilge pump numeral ≥ 30: one additional independent power pump is required."
        : "Minimum 3 power pumps. Each pump must provide the full rule capacity.";
  } else if (shipType === "tanker") {
    pumps = 2;
    extraNote =
      "Machinery space: 2 power pumps. Cargo area requires at least 1 extra pump (no rule capacity formula).";
  } else {
    pumps = 2;
    extraNote = reducedQ
      ? "L < 35 m: capacity is based on 1.22 m/s."
      : "Minimum 2 power pumps. One may be driven by the main engine.";
  }

  const sorted = [...validBranches].sort((a, b) => (b.d1Mm ?? 0) - (a.d1Mm ?? 0));
  let dBox: number | null = null;
  if (sorted.length >= 2) {
    dBox = Math.sqrt(sorted[0].d1Mm! ** 2 + sorted[1].d1Mm! ** 2);
    dBox = Math.min(dBox, dRule);
  } else if (sorted.length === 1) {
    dBox = sorted[0].d1Mm!;
  }

  return {
    shipType,
    breadthUsedM: Bmain,
    dFormulaMm: round1(dFormula),
    dTwiceMm: dTwice == null ? null : round1(dTwice),
    dRuleMm: round1(dRule),
    dMinActualMm: round1(dMinActual),
    recommendedDnMm: recommendDn(dMinActual)!,
    capacityPerPumpM3H: round1(Q),
    totalCapacityM3H: round1(Q * pumps),
    minOnePumpM3H: round1(QminOne),
    reducedQ,
    compensationAllowed,
    pumpCount: pumps,
    cargoAreaPumps: shipType === "tanker" ? 1 : 0,
    distributionBoxMm: dBox == null ? null : round1(dBox),
    maxBranchMm: maxBranch || null,
    extraNote,
    numeralInfo,
    branches,
    machineryBranch,
    formulaNote,
    ruleRef,
  };
}

export function calculatePumpCapacities(
  input: PumpCapacitiesInput,
): PumpCapacitiesResult {
  const bilge = computeBilgeRequirements(input);
  const fire = computeFireRequirements(input);

  const notes: string[] = [
    BV_RULE_REF,
    bilge.formulaNote,
    bilge.extraNote,
    fire.capNote,
  ];

  if (bilge.numeralInfo) {
    notes.push(
      `Passenger bilge numeral = ${bilge.numeralInfo.numeral} (K = ${bilge.numeralInfo.K}, P₁ = ${bilge.numeralInfo.P1}).`,
    );
  }
  if (fire.monitors > 0) {
    notes.push(
      `${fire.monitors} mobile water monitors × ${MONITOR_CAPACITY_M3H} m³/h.`,
    );
  }
  if (!fire.firePumpsEqual) {
    notes.push(
      `Asymmetric fire pumps (info): each ≥ ${fire.asymmetricEachM3H} m³/h (80% rule).`,
    );
  }

  return { bilge, fire, notes };
}
