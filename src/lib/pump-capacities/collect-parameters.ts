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
  }

  return rows;
}
