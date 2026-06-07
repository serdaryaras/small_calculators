import type { ParameterRecord } from "@/lib/parameters";
import { PUMP_PARAMS as P } from "./parameters";
import type { PumpCapacitiesFormState } from "./validate-and-calculate";

function rec(
  meta: { name: string; description: string },
  value: string | number | boolean,
): ParameterRecord {
  return { name: meta.name, value, description: meta.description };
}

export function collectPumpParameters(form: PumpCapacitiesFormState): ParameterRecord[] {
  const rows: ParameterRecord[] = [
    rec(P.shipName, form.shipName),
    rec(P.shipType, form.shipType === "cargo" ? "Cargo ship" : "Passenger ship"),
    rec(P.length, `${form.lengthM} m`),
    rec(P.breadth, `${form.breadthM} m`),
    rec(P.depth, `${form.depthM} m`),
    rec(P.grossTonnage, form.grossTonnage),
    rec(P.firePumpsEqual, form.firePumpsEqual ? "Yes — equal split" : "No — asymmetric"),
  ];

  if (form.shipType === "cargo") {
    rows.push(
      rec(
        P.shortCargoShip,
        form.shortCargoShip || form.lengthM < 35 ? "Yes" : "No",
      ),
    );
    rows.push(rec(P.containerTiers5Plus, form.containerTiers5Plus ? "Yes" : "No"));
    rows.push(rec(P.isTanker, form.isTanker ? "Yes" : "No"));
    if (form.isTanker) {
      rows.push(rec(P.machinerySpaceLength, `${form.machinerySpaceLengthM} m`));
    }
    rows.push(
      rec(P.doubleHullCargoHolds, form.doubleHullCargoHolds ? "Yes" : "No"),
    );
    if (form.doubleHullCargoHolds) {
      rows.push(rec(P.holdBreadthAmidships, `${form.holdBreadthAmidshipsM} m`));
    }
    rows.push(rec(P.bilgeCompartmentCount, form.bilgeCompartments.length));
    form.bilgeCompartments.forEach((compartment, index) => {
      const kind =
        compartment.kind === "cargo_hold"
          ? "Cargo hold"
          : compartment.kind === "machinery"
            ? "Machinery"
            : "Other";
      rows.push({
        name: `${P.bilgeCompartmentLabel.name} ${index + 1}`,
        value: `${compartment.label || kind} — L₁ ${compartment.lengthM} m (${kind})`,
        description: P.bilgeCompartmentLabel.description,
      });
    });
  }

  return rows;
}
