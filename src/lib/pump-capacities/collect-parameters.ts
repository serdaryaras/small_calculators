import type { ParameterRecord } from "@/lib/parameters";
import { PUMP_PARAMS as P } from "./parameters";
import type { PumpCapacitiesFormState } from "./validate-and-calculate";

function rec(
  meta: { name: string; description: string },
  value: string | number | boolean,
): ParameterRecord {
  return { name: meta.name, value, description: meta.description };
}

function shipTypeLabel(t: PumpCapacitiesFormState["shipType"]): string {
  if (t === "passenger") return "Passenger ship";
  if (t === "tanker") return "Tanker";
  return "Cargo ship";
}

export function collectPumpParameters(form: PumpCapacitiesFormState): ParameterRecord[] {
  const rows: ParameterRecord[] = [
    rec(P.shipName, form.shipName),
    rec(P.shipType, shipTypeLabel(form.shipType)),
    rec(P.length, `${form.lengthM} m`),
    rec(P.breadth, `${form.breadthM} m`),
    rec(P.depth, `${form.depthM} m`),
    rec(P.grossTonnage, form.grossTonnage),
    rec(P.fiveTiers, form.fiveTiers ? "Yes" : "No"),
    rec(P.firePumpsEqual, form.firePumpsEqual ? "Yes — equal split" : "No — asymmetric"),
  ];

  if (form.shipType === "tanker") {
    rows.push(rec(P.engineRoomLength, `${form.engineRoomLengthM} m`));
  }

  if (form.shipType === "cargo") {
    rows.push(rec(P.useHoldBreadth, form.useHoldBreadth ? "Yes" : "No"));
    if (form.useHoldBreadth) {
      rows.push(rec(P.holdBreadthAmidships, `${form.holdBreadthAmidshipsM} m`));
    }
  }

  if (form.shipType === "passenger") {
    rows.push(rec(P.passengerM, `${form.passengerM} m³`));
    rows.push(rec(P.passengerP, `${form.passengerP} m³`));
    rows.push(rec(P.passengerV, `${form.passengerV} m³`));
    rows.push(rec(P.passengerN, form.passengerN));
    rows.push(rec(P.passengerPAbove, `${form.passengerPAbove} m³`));
  }

  rows.push(rec(P.bilgeCompartmentCount, form.branches.length));
  form.branches.forEach((branch, index) => {
    rows.push({
      name: `${P.bilgeCompartmentLabel.name} ${index + 1}`,
      value: `${branch.label || `Compartment ${index + 1}`} — L₁ ${branch.lengthM} m${
        branch.isMachinery ? " (machinery)" : ""
      }`,
      description: P.bilgeCompartmentLabel.description,
    });
  });

  return rows;
}
