import { calculatePumpCapacities } from "./calculation";
import type {
  BilgeCompartmentInput,
  BilgeCompartmentKind,
  PumpCapacitiesResult,
  ShipType,
} from "./types";

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
  isTanker: boolean;
  machinerySpaceLengthM: number;
  doubleHullCargoHolds: boolean;
  holdBreadthAmidshipsM: number;
  bilgeCompartments: BilgeCompartmentInput[];
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

  if (form.shipType === "cargo" && form.isTanker) {
    pushPositive(errors, PUMP_LABELS.machinerySpaceLength, form.machinerySpaceLengthM);
  }

  if (form.shipType === "cargo" && form.doubleHullCargoHolds) {
    pushPositive(errors, PUMP_LABELS.holdBreadthAmidships, form.holdBreadthAmidshipsM);
    if (
      Number.isFinite(form.holdBreadthAmidshipsM) &&
      form.holdBreadthAmidshipsM > form.breadthM
    ) {
      errors.push("Hold breadth amidships must not exceed ship breadth B.");
    }
  }

  form.bilgeCompartments.forEach((compartment, index) => {
    pushPositive(
      errors,
      `${PUMP_LABELS.bilgeCompartmentLength} (${compartment.label || `compartment ${index + 1}`})`,
      compartment.lengthM,
    );
  });

  return errors;
}

const PUMP_LABELS = {
  machinerySpaceLength: "Machinery space length C",
  holdBreadthAmidships: "Hold breadth amidships B_hold",
  bilgeCompartmentLength: "Compartment length L₁",
} as const;

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
    isTanker: form.shipType === "cargo" && form.isTanker,
    machinerySpaceLengthM:
      form.shipType === "cargo" && form.isTanker
        ? form.machinerySpaceLengthM
        : null,
    doubleHullCargoHolds:
      form.shipType === "cargo" && form.doubleHullCargoHolds,
    holdBreadthAmidshipsM:
      form.shipType === "cargo" && form.doubleHullCargoHolds
        ? form.holdBreadthAmidshipsM
        : null,
    bilgeCompartments: form.bilgeCompartments,
  });
}

export const BILGE_COMPARTMENT_KIND_OPTIONS: {
  value: BilgeCompartmentKind;
  label: string;
}[] = [
  { value: "cargo_hold", label: "Cargo hold" },
  { value: "machinery", label: "Machinery space" },
  { value: "other", label: "Other dry space" },
];
