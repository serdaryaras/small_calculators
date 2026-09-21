import { calculatePumpCapacities } from "./calculation";
import type { BilgeBranchInput, PumpCapacitiesResult, ShipType, Vt1, Vt2 } from "./types";

export type PumpCapacitiesFormState = {
  shipName: string;
  shipType: ShipType;
  lengthM: number;
  breadthM: number;
  depthM: number;
  grossTonnage: number;
  useHoldBreadth: boolean;
  holdBreadthAmidshipsM: number;
  engineRoomLengthM: number;
  passengerM: number;
  passengerP: number;
  passengerV: number;
  passengerN: number;
  passengerPAbove: number;
  fiveTiers: boolean;
  vt1: Vt1 | null;
  vt2: Vt2 | null;
  firePumpsEqual: boolean;
  branches: BilgeBranchInput[];
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

  if (form.shipType === "tanker") {
    pushPositive(errors, "Engine-room length L₀", form.engineRoomLengthM);
  }

  if (form.useHoldBreadth && form.shipType === "cargo") {
    pushPositive(errors, "Hold breadth amidships B_hold", form.holdBreadthAmidshipsM);
    if (
      Number.isFinite(form.holdBreadthAmidshipsM) &&
      form.holdBreadthAmidshipsM > form.breadthM
    ) {
      errors.push("Hold breadth amidships must not exceed ship breadth B.");
    }
  }

  if (form.shipType === "passenger") {
    pushPositive(errors, "V — volume of machinery spaces", form.passengerV);
  }

  form.branches.forEach((branch, index) => {
    pushPositive(
      errors,
      `Compartment length L₁ (${branch.label || `compartment ${index + 1}`})`,
      branch.lengthM,
    );
  });

  return errors;
}

export function calculatePumpCapacitiesFromForm(
  form: PumpCapacitiesFormState,
): PumpCapacitiesResult {
  const errors = validatePumpCapacitiesForm(form);
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return calculatePumpCapacities({
    shipType: form.shipType,
    lengthM: form.lengthM,
    breadthM: form.breadthM,
    depthM: form.depthM,
    grossTonnage: form.grossTonnage,
    useHoldBreadth: form.shipType === "cargo" && form.useHoldBreadth,
    holdBreadthAmidshipsM:
      form.shipType === "cargo" && form.useHoldBreadth
        ? form.holdBreadthAmidshipsM
        : null,
    engineRoomLengthM:
      form.shipType === "tanker" ? form.engineRoomLengthM : null,
    passengerM: form.passengerM,
    passengerP: form.passengerP,
    passengerV: form.passengerV,
    passengerN: form.passengerN,
    passengerPAbove: form.passengerPAbove,
    fiveTiers: form.fiveTiers,
    vt1: form.vt1,
    vt2: form.vt2,
    firePumpsEqual: form.firePumpsEqual,
    branches: form.branches,
  });
}

export const SHIP_TYPE_OPTIONS: { value: ShipType; label: string }[] = [
  { value: "cargo", label: "Cargo ship" },
  { value: "passenger", label: "Passenger ship" },
  { value: "tanker", label: "Tanker" },
];
