import { FUEL_LABELS, FUEL_TYPES, type FuelType } from "@/lib/eedi/constants";
import { calculateTankCapacities } from "./calculation";
import { DEFAULT_FUEL_DENSITY_KG_M3, SERVICE_TANK_HOURS } from "./constants";
import type {
  BoilerConsumer,
  EngineConsumer,
  FuelConsumerInput,
  ShipParameters,
  TankCapacitiesResult,
} from "./types";

export type TankCapacitiesFormState = {
  shipName: string;
  ship: ShipParameters;
  mainEngines: EngineConsumer[];
  auxiliaryEngines: EngineConsumer[];
  boilers: BoilerConsumer[];
  fuelDensityKgM3: Partial<Record<FuelType, number>>;
  serviceTankVolumeM3: Partial<Record<FuelType, number>>;
};

function pushPositive(errors: string[], label: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    errors.push(`${label} must be a positive number.`);
  }
}

function pushNonNegative(errors: string[], label: string, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    errors.push(`${label} must be zero or greater.`);
  }
}

export function validateTankCapacitiesForm(
  form: TankCapacitiesFormState,
): string[] {
  const errors: string[] = [];

  pushPositive(errors, "V_s (service speed)", form.ship.vsKn);
  pushPositive(errors, "Range", form.ship.rangeNm);
  pushPositive(errors, "Endurance", form.ship.enduranceDays);
  pushPositive(errors, "Non-discharge period", form.ship.nonDischargePeriodDays);

  form.mainEngines.forEach((e, i) => {
    pushPositive(errors, `Main engine ${i + 1} — service power`, e.powerKw);
    pushPositive(errors, `Main engine ${i + 1} — SFOC`, e.sfocGPerKwh);
  });

  form.auxiliaryEngines.forEach((e, i) => {
    pushPositive(errors, `Auxiliary engine ${i + 1} — service power`, e.powerKw);
    pushPositive(errors, `Auxiliary engine ${i + 1} — SFOC`, e.sfocGPerKwh);
  });

  form.boilers.forEach((b, i) => {
    pushNonNegative(errors, `Boiler ${i + 1} — consumption`, b.consumptionKgPerH);
  });

  for (const fuel of FUEL_TYPES) {
    const d = form.fuelDensityKgM3[fuel];
    if (d != null && (!Number.isFinite(d) || d <= 0)) {
      errors.push(`Fuel density for ${fuel} must be positive.`);
    }
    const v = form.serviceTankVolumeM3[fuel];
    if (v != null && (!Number.isFinite(v) || v < 0)) {
      errors.push(`Service-tank volume for ${fuel} cannot be negative.`);
    }
  }

  if (
    form.mainEngines.length === 0 &&
    form.auxiliaryEngines.length === 0 &&
    form.boilers.every((b) => b.consumptionKgPerH === 0)
  ) {
    errors.push("Add at least one fuel consumer with non-zero consumption.");
  }

  return errors;
}

export function calculateTankCapacitiesFromForm(
  form: TankCapacitiesFormState,
): { result: TankCapacitiesResult; warnings: string[] } {
  const errors = validateTankCapacitiesForm(form);
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  const warnings: string[] = [];

  const input: FuelConsumerInput = {
    ship: form.ship,
    mainEngines: form.mainEngines,
    auxiliaryEngines: form.auxiliaryEngines,
    boilers: form.boilers,
    fuelDensityKgM3: form.fuelDensityKgM3,
    serviceTankVolumeM3: form.serviceTankVolumeM3,
  };

  const densities = { ...DEFAULT_FUEL_DENSITY_KG_M3, ...form.fuelDensityKgM3 };
  const result = calculateTankCapacities(input, densities);

  if (result.rangeFuelByType.length === 0) {
    throw new Error("No fuel consumption calculated — check equipment inputs.");
  }

  for (const st of result.serviceTanks) {
    if (st.meetsRequirement === false) {
      warnings.push(
        `Service tank (${FUEL_LABELS[st.fuel]}): design volume ${st.designVolumeM3!.toFixed(1)} m³ is below the ${SERVICE_TANK_HOURS} h minimum (${st.minVolumeM3.toFixed(1)} m³).`,
      );
    }
  }

  return { result, warnings };
}
