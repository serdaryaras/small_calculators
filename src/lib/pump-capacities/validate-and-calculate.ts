import { calculatePumpCapacities } from "./calculation";
import type { PumpCapacitiesResult, ShipType } from "./types";

export type PumpCapacitiesFormState = {
  shipName: string;
  shipType: ShipType;
  lengthM: number;
  breadthM: number;
  depthM: number;
  grossTonnage: number;
  shortCargoShip: boolean;
  containerTiers5Plus: boolean;
  firePumpsEqual: boolean;
};

function pushPositive(errors: string[], label: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    errors.push(`${label} must be a positive number.`);
  }
}

export function validatePumpCapacitiesForm(form: PumpCapacitiesFormState): string[] {
  const errors: string[] = [];

  pushPositive(errors, "L — Length", form.lengthM);
  pushPositive(errors, "B — Breadth", form.breadthM);
  pushPositive(errors, "D — Depth", form.depthM);
  pushPositive(errors, "Gross tonnage", form.grossTonnage);

  return errors;
}

export function calculatePumpCapacitiesFromForm(
  form: PumpCapacitiesFormState,
): PumpCapacitiesResult {
  const errors = validatePumpCapacitiesForm(form);
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  const shortCargoShip =
    form.shipType === "cargo" &&
    (form.shortCargoShip || form.lengthM < 35);

  return calculatePumpCapacities({
    shipType: form.shipType,
    lengthM: form.lengthM,
    breadthM: form.breadthM,
    depthM: form.depthM,
    grossTonnage: form.grossTonnage,
    shortCargoShip,
    containerTiers5Plus: form.containerTiers5Plus,
    firePumpsEqual: form.firePumpsEqual,
  });
}
