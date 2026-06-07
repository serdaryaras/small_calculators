import {
  computeBilgeBranches,
  computeDoubleHullCargoBilge,
  computeTankerMachineryBilge,
  bilgeMainDiameterMm,
  bilgePumpCapacityM3H,
} from "./bilge-extended";
import {
  BILGE_MAIN_D_COEFF,
  BILGE_MAIN_D_TERM,
  BILGE_Q_COEFF_SHORT,
  BILGE_Q_COEFF_STANDARD,
  BV_RULE_REF,
  EMERGENCY_FIRE_FRACTION,
  EMERGENCY_FIRE_MIN_CARGO_LARGE_M3H,
  EMERGENCY_FIRE_MIN_CARGO_SMALL_M3H,
  FIRE_CARGO_VS_PASSENGER_BILGE,
  FIRE_EMERGENCY_CAP_CONTAINER_M3H,
  FIRE_PASSENGER_VS_BILGE,
  FIRE_PUMP_EACH_FRACTION,
  FIRE_PUMP_MIN_EACH_M3H,
  FIRE_TOTAL_CAP_CARGO_M3H,
  SHORT_SHIP_LENGTH_M,
} from "./constants";
import type {
  AsymmetricFireGuidance,
  BilgeExtendedRequirements,
  BilgeRequirements,
  FireRequirements,
  PumpCapacitiesInput,
  PumpCapacitiesResult,
  ShipType,
} from "./types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round0(n: number): number {
  return Math.round(n);
}

export { bilgeMainDiameterMm, bilgeBranchDiameterMm } from "./bilge-extended";

/** Passenger-ship bilge pump capacity reference for cargo fire rule (m³/h). */
export function passengerBilgePumpReferenceM3H(
  L: number,
  B: number,
  D: number,
): number {
  const d = bilgeMainDiameterMm(L, B, D);
  return BILGE_Q_COEFF_STANDARD * d * d;
}

export function minBilgePumpCount(shipType: ShipType): number {
  return shipType === "cargo" ? 2 : 3;
}

export function minFirePumpCount(shipType: ShipType, gt: number): number {
  if (shipType === "passenger" && gt >= 4000) return 3;
  return 2;
}

/** Optional hint when fire pumps are asymmetric — smallest at SOLAS floor, rest share excess. */
export function computeAsymmetricFireGuidance(
  totalRequiredM3H: number,
  minMainPumpCount: number,
  smallestMinM3H: number,
): AsymmetricFireGuidance | null {
  if (minMainPumpCount < 2) return null;

  const excess = totalRequiredM3H - smallestMinM3H;
  const othersEach = excess / (minMainPumpCount - 1);
  const fmtN = (n: number) =>
    n.toLocaleString("en-US", { maximumFractionDigits: 1 });

  return {
    smallestMinM3H: round1(smallestMinM3H),
    othersEachM3H: round1(othersEach),
    line: `Smallest pump ≥ ${fmtN(smallestMinM3H)} m³/h · others ≈ ${fmtN(othersEach)} m³/h each (${minMainPumpCount - 1} pump(s); excess ${fmtN(excess)} m³/h ÷ ${minMainPumpCount - 1})`,
  };
}

export function computeBilgeRequirements(input: PumpCapacitiesInput): BilgeRequirements {
  const { shipType, lengthM, breadthM, depthM, shortCargoShip } = input;

  const useShortFormula =
    shipType === "cargo" &&
    (shortCargoShip || lengthM < SHORT_SHIP_LENGTH_M);

  const minPumpCount = minBilgePumpCount(shipType);
  const tankerMachinery = computeTankerMachineryBilge(input, useShortFormula);

  // Tankers: ER bilge pumps do not drain outside machinery space — [6.8.1] / [6.8.9] · Pt D Ch 7 Sec 4.
  if (input.isTanker && tankerMachinery) {
    const qCoeffLabel = useShortFormula
      ? String(BILGE_Q_COEFF_SHORT)
      : String(BILGE_Q_COEFF_STANDARD);
    return {
      bilgeMode: "tanker_machinery",
      bilgeMainDiameterMm: tankerMachinery.bilgeMainDiameterMm,
      capacityPerPumpM3H: tankerMachinery.capacityPerPumpM3H,
      minPumpCount,
      totalRequiredM3H: round1(
        minPumpCount * tankerMachinery.capacityPerPumpM3H,
      ),
      waterVelocityMs: tankerMachinery.waterVelocityMs,
      formulaNote: `Q = ${qCoeffLabel} × d² — d from ER bilge main [6.8.9], not ship formula [6.8.1].`,
      ruleRef: tankerMachinery.ruleRef,
    };
  }

  const doubleHull = computeDoubleHullCargoBilge(input);
  const breadthForMain =
    doubleHull != null ? doubleHull.holdBreadthM : breadthM;
  const d = bilgeMainDiameterMm(lengthM, breadthForMain, depthM);

  const waterVelocityMs = useShortFormula ? 1.22 : 2;
  const capacityPerPumpM3H = bilgePumpCapacityM3H(d, useShortFormula);

  const formulaNote = useShortFormula
    ? `Q = ${BILGE_Q_COEFF_SHORT} × d² (cargo L < ${SHORT_SHIP_LENGTH_M} m, 1.22 m/s)`
    : `Q = ${BILGE_Q_COEFF_STANDARD} × d² (2 m/s through bilge main)`;

  let mainNote = `d = ${BILGE_MAIN_D_TERM} + ${BILGE_MAIN_D_COEFF}√(L·(B+D))`;
  if (doubleHull != null) {
    mainNote += ` — B_hold = ${doubleHull.holdBreadthM} m ([6.8.1] Note 1)`;
  }

  return {
    bilgeMode: "general",
    bilgeMainDiameterMm: round0(d),
    capacityPerPumpM3H,
    minPumpCount,
    totalRequiredM3H: round1(minPumpCount * capacityPerPumpM3H),
    waterVelocityMs,
    formulaNote,
    ruleRef: `BV NR467 Pt C, Ch 1, Sec 10 [6.7.4] · [6.8.1] — ${mainNote}`,
  };
}

export function computeBilgeExtendedRequirements(
  input: PumpCapacitiesInput,
): BilgeExtendedRequirements {
  const useShortFormula =
    input.shipType === "cargo" &&
    (input.shortCargoShip || input.lengthM < SHORT_SHIP_LENGTH_M);

  return {
    branches: computeBilgeBranches(input),
    tankerMachinery: computeTankerMachineryBilge(input, useShortFormula),
    doubleHullCargo: computeDoubleHullCargoBilge(input),
  };
}

export function computeFireRequirements(
  input: PumpCapacitiesInput,
  bilge: BilgeRequirements,
): FireRequirements {
  const {
    shipType,
    lengthM,
    breadthM,
    depthM,
    grossTonnage,
    containerTiers5Plus,
    firePumpsEqual,
  } = input;

  const minMainPumpCount = minFirePumpCount(shipType, grossTonnage);
  const passengerRef = passengerBilgePumpReferenceM3H(lengthM, breadthM, depthM);

  let totalRequiredM3H: number;
  const ruleRefs: string[] = [
    "SOLAS II-2/10.2.4 (via BV NR467 Pt C, Ch 4, Sec 6)",
    "FSS Code Ch.12 (emergency fire pump)",
  ];

  let tankerFireBasisNote: string | null = null;

  if (shipType === "cargo") {
    totalRequiredM3H = FIRE_CARGO_VS_PASSENGER_BILGE * passengerRef;
    if (input.isTanker) {
      tankerFireBasisNote =
        "Tanker remains a cargo ship for SOLAS II-2/10.2.4.1.2 — fire total uses passenger bilge reference on same L, B, D, not ER bilge pump capacity ([6.8.9]).";
      ruleRefs.push(
        "Tanker (cargo ship): total fire ≥ 4/3 × passenger bilge pump (same L, B, D) — SOLAS II-2/10.2.4.1.2",
      );
      ruleRefs.push(
        "ER bilge [6.8.9] is independent; any bilge pump used for fire main must also satisfy Ch 4 Sec 6 capacity — Pt C [6.7.3] b).",
      );
    } else {
      ruleRefs.push(
        "Cargo: total fire ≥ 4/3 × passenger bilge pump (same L, B, D) — SOLAS II-2/10.2.4.1.2",
      );
    }
  } else {
    totalRequiredM3H = FIRE_PASSENGER_VS_BILGE * bilge.totalRequiredM3H;
    ruleRefs.push(
      "Passenger: total fire ≥ 2/3 × bilge pumps total when employed for bilge — SOLAS II-2/10.2.4.1.1",
    );
  }

  let totalCappedM3H = false;
  if (shipType === "cargo" && totalRequiredM3H > FIRE_TOTAL_CAP_CARGO_M3H) {
    totalRequiredM3H = FIRE_TOTAL_CAP_CARGO_M3H;
    totalCappedM3H = true;
  }

  const asymmetricMinEachM3H = Math.max(
    FIRE_PUMP_MIN_EACH_M3H,
    (FIRE_PUMP_EACH_FRACTION * totalRequiredM3H) / minMainPumpCount,
  );

  const equalCapacityPerPumpM3H = Math.max(
    FIRE_PUMP_MIN_EACH_M3H,
    totalRequiredM3H / minMainPumpCount,
  );

  const capacityPerRequiredPumpM3H = firePumpsEqual
    ? equalCapacityPerPumpM3H
    : asymmetricMinEachM3H;

  if (firePumpsEqual) {
    ruleRefs.push(
      `Equal fire pumps: each ≥ ${round1(equalCapacityPerPumpM3H)} m³/h (total ${round1(totalRequiredM3H)} ÷ ${minMainPumpCount}).`,
    );
  } else {
    ruleRefs.push(
      `Asymmetric fire pumps: total ≥ ${round1(totalRequiredM3H)} m³/h; each required pump ≥ ${round1(asymmetricMinEachM3H)} m³/h (SOLAS 80% rule).`,
    );
  }

  const absEmergencyMin =
    shipType === "cargo" && grossTonnage < 2000
      ? EMERGENCY_FIRE_MIN_CARGO_SMALL_M3H
      : EMERGENCY_FIRE_MIN_CARGO_LARGE_M3H;

  let emergencyRequiredM3H = Math.max(
    absEmergencyMin,
    EMERGENCY_FIRE_FRACTION * totalRequiredM3H,
  );

  let emergencyCappedM3H = false;
  if (
    shipType === "cargo" &&
    containerTiers5Plus &&
    emergencyRequiredM3H > FIRE_EMERGENCY_CAP_CONTAINER_M3H
  ) {
    emergencyRequiredM3H = FIRE_EMERGENCY_CAP_CONTAINER_M3H;
    emergencyCappedM3H = true;
  }

  if (shipType === "passenger" && grossTonnage >= 1000) {
    ruleRefs.push(
      "FSS Ch.12 emergency pump not applicable to passenger ships ≥ 1 000 GT (SOLAS II-2/10.2.3.1.1).",
    );
  }

  const asymmetricGuidance = firePumpsEqual
    ? null
    : computeAsymmetricFireGuidance(
        round1(totalRequiredM3H),
        minMainPumpCount,
        round1(asymmetricMinEachM3H),
      );

  return {
    firePumpsEqual,
    minMainPumpCount,
    totalRequiredM3H: round1(totalRequiredM3H),
    totalCappedM3H,
    equalSplitCapacityM3H: round1(equalCapacityPerPumpM3H),
    capacityPerRequiredPumpM3H: round1(capacityPerRequiredPumpM3H),
    asymmetricGuidance,
    passengerBilgeReferenceM3H:
      shipType === "cargo" ? round1(passengerRef) : null,
    tankerFireBasisNote,
    emergencyRequiredM3H: round1(emergencyRequiredM3H),
    emergencyCappedM3H,
    ruleRefs,
  };
}

export function calculatePumpCapacities(
  input: PumpCapacitiesInput,
): PumpCapacitiesResult {
  const bilge = computeBilgeRequirements(input);
  const bilgeExtended = computeBilgeExtendedRequirements(input);
  const fire = computeFireRequirements(input, bilge);

  const notes: string[] = [BV_RULE_REF];

  if (bilge.bilgeMode === "tanker_machinery" && bilgeExtended.tankerMachinery) {
    notes.push(
      "Tanker: Pt C [6.8.1] ship bilge main does not apply — ER bilge per [6.8.9] · Pt D Ch 7 Sec 4.",
    );
    for (const n of bilgeExtended.tankerMachinery.notes) notes.push(n);
  } else {
    notes.push(
      `Bilge main: d = ${BILGE_MAIN_D_TERM} + ${BILGE_MAIN_D_COEFF}√(L·(B+D)) = ${bilge.bilgeMainDiameterMm} mm.`,
    );
    notes.push(bilge.formulaNote);
  }

  if (bilgeExtended.doubleHullCargo && bilge.bilgeMode !== "tanker_machinery") {
    for (const n of bilgeExtended.doubleHullCargo.notes) notes.push(n);
  }
  for (const branch of bilgeExtended.branches) {
    notes.push(`${branch.label}: branch d₁ = ${branch.diameterMm} mm (L₁ = ${branch.compartmentLengthM} m).`);
  }

  if (fire.totalCappedM3H) {
    notes.push(`Main fire pump total capped at ${FIRE_TOTAL_CAP_CARGO_M3H} m³/h (cargo ship).`);
  }
  if (fire.emergencyCappedM3H) {
    notes.push(
      `Emergency fire pump capped at ${FIRE_EMERGENCY_CAP_CONTAINER_M3H} m³/h (container ≥ 5 tiers).`,
    );
  }

  if (fire.tankerFireBasisNote) {
    notes.push(fire.tankerFireBasisNote);
  }

  if (fire.asymmetricGuidance) {
    notes.push(fire.asymmetricGuidance.line);
  }

  return { bilge, bilgeExtended, fire, notes };
}
