import type { FuelType } from "@/lib/eedi/constants";

export type EngineConsumer = {
  label: string;
  powerKw: number;
  sfocGPerKwh: number;
  fuel: FuelType;
};

export type BoilerConsumer = {
  label: string;
  consumptionKgPerH: number;
  fuel: FuelType;
};

export type WastewaterShipType = 1 | 2 | 3 | 4;

export type WastewaterStream = "black" | "gray" | "laundry" | "galley";

export type SolidWasteCategory = "plastics" | "paper" | "glass_tins" | "food";

export type SludgeK1Mode = "auto" | "hfo_purified" | "diesel_or_no_purification";

export type PeriodSource =
  | "autonomy"
  | "endurance"
  | "range_voyage"
  | "non_discharge"
  | "non_discharge_min_7"
  | "minimum_7"
  | "default_30"
  | "rule";

export type PeriodBasis = {
  days: number;
  hours: number;
  source: PeriodSource;
};

export type SludgeTankResult = {
  k1: number;
  C: number;
  D: number;
  volumeM3: number;
  rule: string;
  formula: string;
};

export type OilyBilgeHolding = {
  P: number;
  volumeM3: number;
  band: string;
  formula: string;
  rule: string;
};

export type SolidWasteCategoryResult = {
  category: SolidWasteCategory;
  label: string;
  rateKgPerPersonDay: number;
  dailyMassKg: number;
  dailyVolumeM3: number;
  voyageMassKg: number;
  voyageVolumeM3: number;
};

export type SolidWasteResult = {
  personsOnBoard: number;
  /** Stowage period — Endurance if set, otherwise Range ÷ V_s. */
  period: FwAutonomy;
  withCompactor: boolean;
  incinerator: boolean;
  categories: SolidWasteCategoryResult[];
};

export type ShipParameters = {
  vsKn: number;
  rangeNm: number;
  enduranceDays: number;
  nonDischargePeriodDays: number;
  personsOnBoard: number;
  shipType: WastewaterShipType;
  vacuumToilet: boolean;
  withCompactor: boolean;
  solidWasteIncinerator: boolean;
  /** Sludge K₁ selection — auto from ME fuel, or manual. */
  sludgeK1Mode: SludgeK1Mode;
};

export type WastewaterStreamResult = {
  stream: WastewaterStream;
  label: string;
  rateLPerPersonDay: number;
  dailyLiters: number;
  dailyM3: number;
  holdingLiters: number;
  holdingM3: number;
};

export type WastewaterTankId = "black" | "gray";

/** Holding tanks on board — gray, laundry and galley merge into one gray-water tank. */
export type WastewaterTankResult = {
  id: WastewaterTankId;
  label: string;
  rateLPerPersonDay: number;
  dailyLiters: number;
  dailyM3: number;
  holdingLiters: number;
  holdingM3: number;
  components: WastewaterStreamResult[];
};

export type WastewaterResult = {
  shipType: WastewaterShipType;
  vacuumToilet: boolean;
  personsOnBoard: number;
  /** Source streams — rate reference only. */
  streams: WastewaterStreamResult[];
  /** Black-water and combined gray-water holding tanks. */
  tanks: WastewaterTankResult[];
  totalDailyLiters: number;
  totalDailyM3: number;
  totalHoldingLiters: number;
  totalHoldingM3: number;
  blackWaterDailyM3: number;
  blackWaterHoldingM3: number;
  grayWaterTotalDailyM3: number;
  grayWaterTotalHoldingM3: number;
};

export type FuelConsumerInput = {
  ship: ShipParameters;
  mainEngines: EngineConsumer[];
  auxiliaryEngines: EngineConsumer[];
  boilers: BoilerConsumer[];
  /** Fuel density by type (kg/m³). */
  fuelDensityKgM3: Partial<Record<FuelType, number>>;
  /** Design service-tank volume by fuel type (m³), optional check. */
  serviceTankVolumeM3: Partial<Record<FuelType, number>>;
};

export type FuelTypeBreakdown = {
  fuel: FuelType;
  massKg: number;
  volumeM3: number;
  /** Consumers contributing to range fuel (for transparency). */
  consumers: { label: string; massKg: number }[];
};

export type ServiceTankRequirement = {
  fuel: FuelType;
  massKg8h: number;
  minVolumeM3: number;
  designVolumeM3?: number;
  meetsRequirement: boolean | null;
};

export type FwAutonomySource = "endurance" | "range_voyage";

/** Time basis for fresh-water tank sizing — Endurance, or voyage when Endurance is 0. */
export type FwAutonomy = {
  days: number;
  hours: number;
  source: FwAutonomySource;
};

/** Fresh-water demand equals daily wastewater total; tank sized for FW autonomy period. */
export type FreshWaterResult = {
  dailyLiters: number;
  dailyM3: number;
  tankLiters: number;
  tankM3: number;
};

/** Time basis for sewage / holding-tank sizing (min. 7 days applied). */
export type SewageHolding = PeriodBasis;

export type TankCapacitiesResult = {
  voyageHours: number;
  voyageDays: number;
  /** FW tank autonomy — Endurance if set, otherwise Range ÷ V_s. */
  fwAutonomy: FwAutonomy;
  /** Sewage holding period — Non-discharge period, min. 7 days. */
  sewageHolding: SewageHolding;
  wastewater: WastewaterResult;
  freshWater: FreshWaterResult;
  solidWaste: SolidWasteResult;
  /** Daily fuel volume C (m³/day) for sludge formula. */
  dailyFuelM3: number;
  /** Main-engine rating P (kW) for oily bilge. */
  mainEngineRatingKw: number;
  sludgePeriod: PeriodBasis;
  sludge: SludgeTankResult | null;
  oilyBilge: OilyBilgeHolding | null;
  rangeFuelByType: FuelTypeBreakdown[];
  totalFuelMassKg: number;
  totalFuelVolumeM3: number;
  serviceTanks: ServiceTankRequirement[];
};
