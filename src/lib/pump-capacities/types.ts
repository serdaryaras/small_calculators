export type ShipType = "cargo" | "passenger" | "tanker";

export type Vt1 = 1 | 2 | 3 | 4;
export type Vt2 = 1 | 2 | 3;

export type BilgeBranchInput = {
  label: string;
  lengthM: number;
  isMachinery: boolean;
};

export type PumpCapacitiesInput = {
  shipType: ShipType;
  lengthM: number;
  breadthM: number;
  depthM: number;
  grossTonnage: number;
  /** Cargo double hull — use hold breadth amidships for main + non-machinery branches. */
  useHoldBreadth: boolean;
  holdBreadthAmidshipsM: number | null;
  /** Tanker engine-room length L₀ (m). */
  engineRoomLengthM: number | null;
  /** Passenger bilge-pump numeral inputs (Pt D Ch 11). */
  passengerM: number;
  passengerP: number;
  passengerV: number;
  passengerN: number;
  passengerPAbove: number;
  fiveTiers: boolean;
  /** Optional override; null → auto from type + GT. */
  vt1: Vt1 | null;
  /** Optional override; null → auto from type + fiveTiers. */
  vt2: Vt2 | null;
  firePumpsEqual: boolean;
  branches: BilgeBranchInput[];
};

export type BranchResult = {
  label: string;
  lengthM: number;
  isMachinery: boolean;
  d1RawMm: number | null;
  d1Mm: number | null;
  valid: boolean;
  synthetic?: boolean;
};

export type PassengerNumeralInfo = {
  K: number;
  P1: number;
  numeral: number;
};

export type BilgeResult = {
  shipType: ShipType;
  breadthUsedM: number;
  dFormulaMm: number;
  dTwiceMm: number | null;
  dRuleMm: number;
  dMinActualMm: number;
  recommendedDnMm: number;
  capacityPerPumpM3H: number;
  totalCapacityM3H: number;
  minOnePumpM3H: number;
  reducedQ: boolean;
  compensationAllowed: boolean;
  pumpCount: number;
  cargoAreaPumps: number;
  distributionBoxMm: number | null;
  maxBranchMm: number | null;
  extraNote: string;
  numeralInfo: PassengerNumeralInfo | null;
  branches: BranchResult[];
  machineryBranch: BranchResult | null;
  formulaNote: string;
  ruleRef: string;
};

export type FireResult = {
  vt1: Vt1;
  vt2: Vt2;
  vt1Label: string;
  vt2Label: string;
  pumpCount: number;
  dBilgeRefMm: number;
  qBilgeRefM3H: number;
  totalRequiredM3H: number;
  equalEachM3H: number;
  asymmetricEachM3H: number;
  firePumpsEqual: boolean;
  emergencyRequired: boolean;
  emergencyM3H: number | null;
  hydrantPressureNMm2: number;
  monitors: number;
  capNote: string;
};

export type PumpCapacitiesResult = {
  bilge: BilgeResult;
  fire: FireResult;
  notes: string[];
};
