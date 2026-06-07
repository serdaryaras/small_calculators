import type { FuelType } from "@/lib/eedi/constants";
import { SERVICE_TANK_HOURS } from "./constants";
import type {
  BoilerConsumer,
  EngineConsumer,
  FreshWaterResult,
  FuelConsumerInput,
  FuelTypeBreakdown,
  FwAutonomy,
  FwAutonomySource,
  ServiceTankRequirement,
  SewageHolding,
  TankCapacitiesResult,
  WastewaterResult,
} from "./types";
import { computeSolidWaste } from "./solid-waste";
import { computeWastewater } from "./wastewater";

function engineFuelKg(powerKw: number, sfocGPerKwh: number, hours: number): number {
  return (powerKw * sfocGPerKwh * hours) / 1000;
}

function boilerFuelKg(kgPerH: number, hours: number): number {
  return kgPerH * hours;
}

function density(
  fuel: FuelType,
  densities: Partial<Record<FuelType, number>>,
  fallback: number,
): number {
  const d = densities[fuel];
  return d != null && d > 0 ? d : fallback;
}

function addMass(
  map: Map<FuelType, { massKg: number; consumers: { label: string; massKg: number }[] }>,
  fuel: FuelType,
  label: string,
  massKg: number,
) {
  if (massKg <= 0) return;
  const entry = map.get(fuel) ?? { massKg: 0, consumers: [] };
  entry.massKg += massKg;
  entry.consumers.push({ label, massKg });
  map.set(fuel, entry);
}

export function voyageHours(rangeNm: number, vsKn: number): number {
  return rangeNm / vsKn;
}

/** FW autonomy: Endurance when given (> 0), otherwise voyage time from Range ÷ V_s. */
export function resolveFwAutonomy(
  enduranceDays: number,
  voyageDays: number,
): FwAutonomy {
  const useEndurance = Number.isFinite(enduranceDays) && enduranceDays > 0;
  const days = useEndurance ? enduranceDays : voyageDays;
  const source: FwAutonomySource = useEndurance ? "endurance" : "range_voyage";
  return { days, hours: days * 24, source };
}

/** Sewage / holding-tank period from non-discharge period. */
export function resolveSewageHolding(nonDischargePeriodDays: number): SewageHolding {
  const days = nonDischargePeriodDays;
  return { days, hours: days * 24 };
}

/** Daily FW equals total daily wastewater; tank capacity = daily × FW autonomy (Endurance). */
export function computeFreshWater(
  wastewater: WastewaterResult,
  fwAutonomy: FwAutonomy,
): FreshWaterResult {
  const dailyLiters = wastewater.totalDailyLiters;
  const dailyM3 = wastewater.totalDailyM3;
  return {
    dailyLiters,
    dailyM3,
    tankLiters: dailyLiters * fwAutonomy.days,
    tankM3: dailyM3 * fwAutonomy.days,
  };
}

export function accumulateRangeFuel(
  hours: number,
  mainEngines: EngineConsumer[],
  auxiliaryEngines: EngineConsumer[],
  boilers: BoilerConsumer[],
  fuelDensityKgM3: Partial<Record<FuelType, number>>,
  defaultDensity: Record<FuelType, number>,
): FuelTypeBreakdown[] {
  const byFuel = new Map<
    FuelType,
    { massKg: number; consumers: { label: string; massKg: number }[] }
  >();

  for (const e of mainEngines) {
    const m = engineFuelKg(e.powerKw, e.sfocGPerKwh, hours);
    addMass(byFuel, e.fuel, e.label, m);
  }
  for (const e of auxiliaryEngines) {
    const m = engineFuelKg(e.powerKw, e.sfocGPerKwh, hours);
    addMass(byFuel, e.fuel, e.label, m);
  }
  for (const b of boilers) {
    const m = boilerFuelKg(b.consumptionKgPerH, hours);
    addMass(byFuel, b.fuel, b.label, m);
  }

  const breakdown: FuelTypeBreakdown[] = [];
  for (const [fuel, data] of byFuel) {
    const rho = density(fuel, fuelDensityKgM3, defaultDensity[fuel]);
    breakdown.push({
      fuel,
      massKg: data.massKg,
      volumeM3: data.massKg / rho,
      consumers: data.consumers,
    });
  }
  breakdown.sort((a, b) => b.massKg - a.massKg);
  return breakdown;
}

export function serviceTankRequirements(
  mainEngines: EngineConsumer[],
  auxiliaryEngines: EngineConsumer[],
  boilers: BoilerConsumer[],
  fuelDensityKgM3: Partial<Record<FuelType, number>>,
  defaultDensity: Record<FuelType, number>,
  serviceTankVolumeM3: Partial<Record<FuelType, number>>,
): ServiceTankRequirement[] {
  const hours = SERVICE_TANK_HOURS;
  const byFuel = new Map<FuelType, number>();

  const add = (fuel: FuelType, massKg: number) => {
    if (massKg <= 0) return;
    byFuel.set(fuel, (byFuel.get(fuel) ?? 0) + massKg);
  };

  for (const e of mainEngines) {
    add(e.fuel, engineFuelKg(e.powerKw, e.sfocGPerKwh, hours));
  }
  for (const e of auxiliaryEngines) {
    add(e.fuel, engineFuelKg(e.powerKw, e.sfocGPerKwh, hours));
  }
  for (const b of boilers) {
    add(b.fuel, boilerFuelKg(b.consumptionKgPerH, hours));
  }

  const fuels = [...byFuel.keys()].sort();
  return fuels.map((fuel) => {
    const massKg8h = byFuel.get(fuel) ?? 0;
    const rho = density(fuel, fuelDensityKgM3, defaultDensity[fuel]);
    const minVolumeM3 = massKg8h / rho;
    const design = serviceTankVolumeM3[fuel];
    const meetsRequirement =
      design != null && design > 0 ? design >= minVolumeM3 : null;
    return {
      fuel,
      massKg8h,
      minVolumeM3,
      designVolumeM3: design != null && design > 0 ? design : undefined,
      meetsRequirement,
    };
  });
}

export function calculateTankCapacities(
  input: FuelConsumerInput,
  defaultDensity: Record<FuelType, number>,
): TankCapacitiesResult {
  const { ship, mainEngines, auxiliaryEngines, boilers } = input;
  const hours = voyageHours(ship.rangeNm, ship.vsKn);
  const voyageDays = hours / 24;
  const fwAutonomy = resolveFwAutonomy(ship.enduranceDays, voyageDays);
  const sewageHolding = resolveSewageHolding(ship.nonDischargePeriodDays);
  const wastewater = computeWastewater(
    ship.shipType,
    ship.vacuumToilet,
    ship.personsOnBoard,
    ship.nonDischargePeriodDays,
  );
  const freshWater = computeFreshWater(wastewater, fwAutonomy);
  const solidWaste = computeSolidWaste(
    ship.personsOnBoard,
    fwAutonomy,
    ship.withCompactor,
    ship.solidWasteIncinerator,
  );

  const rangeFuelByType = accumulateRangeFuel(
    hours,
    mainEngines,
    auxiliaryEngines,
    boilers,
    input.fuelDensityKgM3,
    defaultDensity,
  );

  const totalFuelMassKg = rangeFuelByType.reduce((s, r) => s + r.massKg, 0);
  const totalFuelVolumeM3 = rangeFuelByType.reduce((s, r) => s + r.volumeM3, 0);

  const serviceTanks = serviceTankRequirements(
    mainEngines,
    auxiliaryEngines,
    boilers,
    input.fuelDensityKgM3,
    defaultDensity,
    input.serviceTankVolumeM3,
  );

  return {
    voyageHours: hours,
    voyageDays,
    fwAutonomy,
    sewageHolding,
    wastewater,
    freshWater,
    solidWaste,
    rangeFuelByType,
    totalFuelMassKg,
    totalFuelVolumeM3,
    serviceTanks,
  };
}
