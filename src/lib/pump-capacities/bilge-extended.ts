import {
  BILGE_BRANCH_D_COEFF,
  BILGE_BRANCH_D_TERM,
  BILGE_BRANCH_MAX_MM,
  BILGE_BRANCH_MIN_MM,
  BILGE_MAIN_D_COEFF,
  BILGE_MAIN_D_TERM,
  BILGE_MAIN_MIN_MM,
  BILGE_Q_COEFF_SHORT,
  BILGE_Q_COEFF_STANDARD,
} from "./constants";
import type {
  BilgeBranchResult,
  BilgeCompartmentInput,
  BilgeCompartmentKind,
  DoubleHullCargoBilge,
  PumpCapacitiesInput,
  TankerMachineryBilge,
} from "./types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round0(n: number): number {
  return Math.round(n);
}

/** Nearest 5 mm — common class rounding for bilge pipe diameters. */
export function roundBilgePipeDiameterMm(d: number): number {
  return Math.round(d / 5) * 5;
}

/** BV NR467 Pt C, Ch 1, Sec 10 [6.8.1] — bilge main internal diameter (mm). */
export function bilgeMainDiameterMm(L: number, B: number, D: number): number {
  const raw = BILGE_MAIN_D_TERM + BILGE_MAIN_D_COEFF * Math.sqrt(L * (B + D));
  const rounded = roundBilgePipeDiameterMm(raw);
  return Math.max(BILGE_MAIN_MIN_MM, rounded);
}

/** BV [6.8.3] — branch bilge suction internal diameter (mm). */
export function bilgeBranchDiameterMm(
  compartmentLengthM: number,
  breadthM: number,
  depthM: number,
): number {
  const raw =
    BILGE_BRANCH_D_TERM +
    BILGE_BRANCH_D_COEFF * Math.sqrt(compartmentLengthM * (breadthM + depthM));
  const rounded = roundBilgePipeDiameterMm(raw);
  return Math.min(
    BILGE_BRANCH_MAX_MM,
    Math.max(BILGE_BRANCH_MIN_MM, rounded),
  );
}

/** Tanker / machinery-only bilge main — Pt C [6.8.9] · Pt D, Ch 7, Sec 4 (same branch formula, C = machinery length). */
export function tankerMachineryBilgeMainMm(
  machineryLengthM: number,
  breadthM: number,
  depthM: number,
): number {
  const raw =
    BILGE_BRANCH_D_TERM +
    BILGE_BRANCH_D_COEFF * Math.sqrt(machineryLengthM * (breadthM + depthM));
  return roundBilgePipeDiameterMm(raw);
}

export function bilgePumpCapacityM3H(
  diameterMm: number,
  useShortFormula: boolean,
): number {
  const qCoeff = useShortFormula ? BILGE_Q_COEFF_SHORT : BILGE_Q_COEFF_STANDARD;
  return round1(qCoeff * diameterMm * diameterMm);
}

function breadthForCompartment(
  input: PumpCapacitiesInput,
  kind: BilgeCompartmentKind,
): number {
  if (
    kind === "cargo_hold" &&
    input.doubleHullCargoHolds &&
    input.holdBreadthAmidshipsM != null &&
    input.holdBreadthAmidshipsM > 0
  ) {
    return input.holdBreadthAmidshipsM;
  }
  return input.breadthM;
}

export function computeBilgeBranches(
  input: PumpCapacitiesInput,
): BilgeBranchResult[] {
  return input.bilgeCompartments.map((compartment, index) =>
    computeSingleBranch(input, compartment, index),
  );
}

function computeSingleBranch(
  input: PumpCapacitiesInput,
  compartment: BilgeCompartmentInput,
  index: number,
): BilgeBranchResult {
  const breadthUsedM = breadthForCompartment(input, compartment.kind);
  const diameterMm = bilgeBranchDiameterMm(
    compartment.lengthM,
    breadthUsedM,
    input.depthM,
  );

  let breadthNote = `Ship breadth B = ${breadthUsedM} m`;
  if (breadthUsedM !== input.breadthM) {
    breadthNote = `Hold breadth amidships B_hold = ${breadthUsedM} m — BV [6.8.3] b)`;
  }

  const kindLabel =
    compartment.kind === "cargo_hold"
      ? "Cargo hold"
      : compartment.kind === "machinery"
        ? "Machinery space"
        : "Other space";

  return {
    label: compartment.label.trim() || `${kindLabel} ${index + 1}`,
    kind: compartment.kind,
    compartmentLengthM: compartment.lengthM,
    breadthUsedM,
    diameterMm,
    formulaNote: `d₁ = 25 + 2.16√(L₁·(B+D)) — L₁ = ${compartment.lengthM} m; ${breadthNote}`,
    ruleRef: "BV NR467 Pt C, Ch 1, Sec 10 [6.8.3]",
  };
}

export function computeTankerMachineryBilge(
  input: PumpCapacitiesInput,
  useShortFormula: boolean,
): TankerMachineryBilge | null {
  if (!input.isTanker || input.machinerySpaceLengthM == null) return null;

  const machineryLengthM = input.machinerySpaceLengthM;
  const branchDiameterMm = bilgeBranchDiameterMm(
    machineryLengthM,
    input.breadthM,
    input.depthM,
  );
  const formulaDiameterMm = tankerMachineryBilgeMainMm(
    machineryLengthM,
    input.breadthM,
    input.depthM,
  );
  const minMainFromBranchMm = roundBilgePipeDiameterMm(
    Math.sqrt(2) * branchDiameterMm,
  );
  const bilgeMainDiameterMm = Math.max(
    formulaDiameterMm,
    minMainFromBranchMm,
  );
  const capacityPerPumpM3H = bilgePumpCapacityM3H(
    bilgeMainDiameterMm,
    useShortFormula,
  );

  return {
    machineryLengthM,
    branchDiameterMm,
    formulaDiameterMm,
    minMainFromBranchMm,
    bilgeMainDiameterMm,
    capacityPerPumpM3H,
    waterVelocityMs: useShortFormula ? 1.22 : 2,
    ruleRef:
      "BV NR467 Pt C, Ch 1, Sec 10 [6.8.9] · Pt D, Ch 7, Sec 4 — machinery-space bilge only",
    notes: [
      `Bilge main d = 25 + 2.16√(C·(B+D)) with C = ${machineryLengthM} m (engine-room length).`,
      `Branch suction in machinery space: d₁ = ${branchDiameterMm} mm (same formula, [6.8.3]).`,
      `Machinery-space bilge main cross-section ≥ 2× branch area → d ≥ ${minMainFromBranchMm} mm ([6.8.1] Note 1).`,
    ],
  };
}

export function computeDoubleHullCargoBilge(
  input: PumpCapacitiesInput,
): DoubleHullCargoBilge | null {
  if (
    !input.doubleHullCargoHolds ||
    input.holdBreadthAmidshipsM == null ||
    input.holdBreadthAmidshipsM <= 0
  ) {
    return null;
  }

  const holdBreadthM = input.holdBreadthAmidshipsM;
  const holdBilgeMainDiameterMm = bilgeMainDiameterMm(
    input.lengthM,
    holdBreadthM,
    input.depthM,
  );
  const standardBilgeMainDiameterMm = bilgeMainDiameterMm(
    input.lengthM,
    input.breadthM,
    input.depthM,
  );

  return {
    holdBreadthM,
    bilgeMainDiameterMm: holdBilgeMainDiameterMm,
    standardBilgeMainDiameterMm,
    ruleRef: "BV NR467 Pt C, Ch 1, Sec 10 [6.8.1] Note 1 · [6.8.3] b)",
    notes: [
      `Side ballast double hull — bilge main may use hold breadth amidships B_hold = ${holdBreadthM} m instead of ship breadth B = ${input.breadthM} m.`,
      `Hold branch suctions use B_hold per [6.8.3] b); machinery-space branches use full ship breadth unless entered separately.`,
    ],
  };
}
