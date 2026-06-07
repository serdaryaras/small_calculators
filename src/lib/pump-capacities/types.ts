export type ShipType = "cargo" | "passenger";

export type PumpCapacitiesInput = {
  shipType: ShipType;
  lengthM: number;
  breadthM: number;
  depthM: number;
  grossTonnage: number;
  /** Cargo ships < 35 m — reduced bilge pump formula (BV [6.7.4] Note 1). */
  shortCargoShip: boolean;
  /** Container ship with ≥ 5 tiers on/above weather deck — 180 / 72 m³/h caps. */
  containerTiers5Plus: boolean;
  /** Equal split: total ÷ n. Asymmetric: show optional capacity guidance. */
  firePumpsEqual: boolean;
};

export type AsymmetricFireGuidance = {
  smallestMinM3H: number;
  othersEachM3H: number;
  line: string;
};

export type BilgeRequirements = {
  bilgeMainDiameterMm: number;
  capacityPerPumpM3H: number;
  minPumpCount: number;
  totalRequiredM3H: number;
  waterVelocityMs: number;
  formulaNote: string;
  ruleRef: string;
};

export type FireRequirements = {
  firePumpsEqual: boolean;
  minMainPumpCount: number;
  totalRequiredM3H: number;
  totalCappedM3H: boolean;
  /** Reference equal split — total ÷ n (min 25), always shown. */
  equalSplitCapacityM3H: number;
  /** Equal: same as equalSplit. Asymmetric: SOLAS floor for smallest pump (80% rule). */
  capacityPerRequiredPumpM3H: number;
  /** Set when firePumpsEqual is false — optional design hint. */
  asymmetricGuidance: AsymmetricFireGuidance | null;
  passengerBilgeReferenceM3H: number | null;
  emergencyRequiredM3H: number;
  emergencyCappedM3H: boolean;
  ruleRefs: string[];
};

export type PumpCapacitiesResult = {
  bilge: BilgeRequirements;
  fire: FireRequirements;
  notes: string[];
};
