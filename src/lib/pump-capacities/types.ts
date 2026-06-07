export type ShipType = "cargo" | "passenger";



export type BilgeCompartmentKind = "cargo_hold" | "machinery" | "other";



export type BilgeCompartmentInput = {

  label: string;

  lengthM: number;

  kind: BilgeCompartmentKind;

};



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

  /** Oil / chemical tanker — machinery-space bilge only (Pt D, Ch 7, Sec 4). */

  isTanker: boolean;

  /** Engine-room length C (m) — tanker machinery bilge main formula. */

  machinerySpaceLengthM: number | null;

  /** Cargo ship with side ballast double hull on full hold length. */

  doubleHullCargoHolds: boolean;

  /** Actual hold breadth amidships (m) — double-hull bilge main and hold branches. */

  holdBreadthAmidshipsM: number | null;

  /** Compartments for branch bilge suction diameter [6.8.3]. */

  bilgeCompartments: BilgeCompartmentInput[];

};



export type AsymmetricFireGuidance = {

  smallestMinM3H: number;

  othersEachM3H: number;

  line: string;

};



/** general — Pt C [6.8.1] ship bilge main; tanker_machinery — ER-only per [6.8.9] · Pt D Ch 7 Sec 4. */
export type BilgeMode = "general" | "tanker_machinery";

export type BilgeRequirements = {
  bilgeMode: BilgeMode;
  bilgeMainDiameterMm: number;
  capacityPerPumpM3H: number;
  minPumpCount: number;
  totalRequiredM3H: number;
  waterVelocityMs: number;
  formulaNote: string;
  ruleRef: string;
};



export type BilgeBranchResult = {

  label: string;

  kind: BilgeCompartmentKind;

  compartmentLengthM: number;

  breadthUsedM: number;

  diameterMm: number;

  formulaNote: string;

  ruleRef: string;

};



export type TankerMachineryBilge = {

  machineryLengthM: number;

  branchDiameterMm: number;

  formulaDiameterMm: number;

  minMainFromBranchMm: number;

  bilgeMainDiameterMm: number;

  capacityPerPumpM3H: number;

  waterVelocityMs: number;

  ruleRef: string;

  notes: string[];

};



export type DoubleHullCargoBilge = {

  holdBreadthM: number;

  bilgeMainDiameterMm: number;

  standardBilgeMainDiameterMm: number;

  ruleRef: string;

  notes: string[];

};



export type BilgeExtendedRequirements = {

  branches: BilgeBranchResult[];

  tankerMachinery: TankerMachineryBilge | null;

  doubleHullCargo: DoubleHullCargoBilge | null;

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

  /** Tanker: clarifies fire rule still uses passenger bilge reference, not ER bilge. */
  tankerFireBasisNote: string | null;

  emergencyRequiredM3H: number;

  emergencyCappedM3H: boolean;

  ruleRefs: string[];

};



export type PumpCapacitiesResult = {

  bilge: BilgeRequirements;

  bilgeExtended: BilgeExtendedRequirements;

  fire: FireRequirements;

  notes: string[];

};


