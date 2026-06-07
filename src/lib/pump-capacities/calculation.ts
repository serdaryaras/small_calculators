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

/** BV NR467 Pt C, Ch 1, Sec 10 [6.8.1] — bilge main internal diameter (mm). */
export function bilgeMainDiameterMm(L: number, B: number, D: number): number {
  return BILGE_MAIN_D_TERM + BILGE_MAIN_D_COEFF * Math.sqrt(L * (B + D));
}

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

export function computeBilgeRequirements(
  input: Pick<
    PumpCapacitiesInput,
    "shipType" | "lengthM" | "breadthM" | "depthM" | "shortCargoShip"
  >,
): BilgeRequirements {
  const { shipType, lengthM, breadthM, depthM, shortCargoShip } = input;
  const d = bilgeMainDiameterMm(lengthM, breadthM, depthM);

  const useShortFormula =
    shipType === "cargo" &&
    (shortCargoShip || lengthM < SHORT_SHIP_LENGTH_M);

  const qCoeff = useShortFormula ? BILGE_Q_COEFF_SHORT : BILGE_Q_COEFF_STANDARD;
  const waterVelocityMs = useShortFormula ? 1.22 : 2;
  const capacityPerPumpM3H = qCoeff * d * d;
  const minPumpCount = minBilgePumpCount(shipType);

  const formulaNote = useShortFormula
    ? `Q = ${BILGE_Q_COEFF_SHORT} × d² (cargo L < ${SHORT_SHIP_LENGTH_M} m, 1.22 m/s)`
    : `Q = ${BILGE_Q_COEFF_STANDARD} × d² (2 m/s through bilge main)`;

  return {
    bilgeMainDiameterMm: round0(d),
    capacityPerPumpM3H: round1(capacityPerPumpM3H),
    minPumpCount,
    totalRequiredM3H: round1(minPumpCount * capacityPerPumpM3H),
    waterVelocityMs,
    formulaNote,
    ruleRef: "BV NR467 Pt C, Ch 1, Sec 10 [6.7.4] · [6.8.1]",
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

  if (shipType === "cargo") {
    totalRequiredM3H = FIRE_CARGO_VS_PASSENGER_BILGE * passengerRef;
    ruleRefs.push(
      "Cargo: total fire ≥ 4/3 × passenger bilge pump (same L, B, D) — SOLAS II-2/10.2.4.1.2",
    );
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
    emergencyRequiredM3H: round1(emergencyRequiredM3H),
    emergencyCappedM3H,
    ruleRefs,
  };
}

export function calculatePumpCapacities(
  input: PumpCapacitiesInput,
): PumpCapacitiesResult {
  const bilge = computeBilgeRequirements(input);
  const fire = computeFireRequirements(input, bilge);

  const notes: string[] = [
    BV_RULE_REF,
    `Bilge main: d = ${BILGE_MAIN_D_TERM} + ${BILGE_MAIN_D_COEFF}√(L·(B+D)) = ${bilge.bilgeMainDiameterMm} mm.`,
    bilge.formulaNote,
  ];

  if (fire.totalCappedM3H) {
    notes.push(`Main fire pump total capped at ${FIRE_TOTAL_CAP_CARGO_M3H} m³/h (cargo ship).`);
  }
  if (fire.emergencyCappedM3H) {
    notes.push(
      `Emergency fire pump capped at ${FIRE_EMERGENCY_CAP_CONTAINER_M3H} m³/h (container ≥ 5 tiers).`,
    );
  }

  if (fire.asymmetricGuidance) {
    notes.push(fire.asymmetricGuidance.line);
  }

  return { bilge, fire, notes };
}
