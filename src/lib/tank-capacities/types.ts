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

export type ShipParameters = {
  vsKn: number;
  rangeNm: number;
  enduranceDays: number;
  nonDischargePeriodDays: number;
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

export type TankCapacitiesResult = {
  voyageHours: number;
  voyageDays: number;
  rangeFuelByType: FuelTypeBreakdown[];
  totalFuelMassKg: number;
  totalFuelVolumeM3: number;
  serviceTanks: ServiceTankRequirement[];
};
