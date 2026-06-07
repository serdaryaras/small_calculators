import { FUEL_LABELS, FUEL_TYPES, type FuelType } from "@/lib/eedi/constants";
import type { ParameterRecord } from "@/lib/parameters";
import { DEFAULT_FUEL_DENSITY_KG_M3 } from "./constants";
import { TANK_PARAMS as P } from "./parameters";
import type { TankCapacitiesFormState } from "./validate-and-calculate";
import { WASTEWATER_SHIP_TYPES } from "./wastewater";

function rec(
  meta: { name: string; description: string },
  value: string | number | boolean,
): ParameterRecord {
  return { name: meta.name, value, description: meta.description };
}

function fuelsInUse(form: TankCapacitiesFormState): FuelType[] {
  const set = new Set<FuelType>();
  for (const e of form.mainEngines) set.add(e.fuel);
  for (const e of form.auxiliaryEngines) set.add(e.fuel);
  for (const b of form.boilers) {
    if (b.consumptionKgPerH > 0) set.add(b.fuel);
  }
  return FUEL_TYPES.filter((f) => set.has(f));
}

function densityFor(
  fuel: FuelType,
  overrides: Partial<Record<FuelType, number>>,
): number {
  return overrides[fuel] ?? DEFAULT_FUEL_DENSITY_KG_M3[fuel];
}

/** Reads all Tank Capacities form fields into ParameterRecord[] (name · value · description). */
export function collectTankParameters(form: TankCapacitiesFormState): ParameterRecord[] {
  const rows: ParameterRecord[] = [
    rec(P.shipName, form.shipName),
    rec(
      P.shipType,
      WASTEWATER_SHIP_TYPES.find((t) => t.value === form.ship.shipType)?.label ??
        form.ship.shipType,
    ),
    rec(P.vs, form.ship.vsKn),
    rec(P.personsOnBoard, form.ship.personsOnBoard),
    rec(P.range, form.ship.rangeNm),
    rec(
      P.endurance,
      form.ship.enduranceDays > 0
        ? form.ship.enduranceDays
        : "0 (auto — from Range ÷ V_s)",
    ),
    rec(P.nonDischargePeriod, form.ship.nonDischargePeriodDays),
    rec(P.vacuumToilet, form.ship.vacuumToilet ? "Yes" : "No"),
    rec(P.withCompactor, form.ship.withCompactor ? "Yes" : "No"),
    rec(P.solidWasteIncinerator, form.ship.solidWasteIncinerator ? "Yes" : "No"),
    rec(P.nMainEngines, form.mainEngines.length),
  ];

  form.mainEngines.forEach((me, i) => {
    rows.push(
      rec({ ...P.powerMe, name: `${P.powerMe.name} (${me.label})` }, me.powerKw),
      rec({ ...P.sfocMe, name: `${P.sfocMe.name} (${me.label})` }, me.sfocGPerKwh),
      rec(
        { ...P.fuelMe, name: `${P.fuelMe.name} (${me.label})` },
        FUEL_LABELS[me.fuel],
      ),
    );
  });

  rows.push(rec(P.nAuxEngines, form.auxiliaryEngines.length));

  form.auxiliaryEngines.forEach((ae, i) => {
    rows.push(
      rec({ ...P.powerAe, name: `${P.powerAe.name} (${ae.label})` }, ae.powerKw),
      rec({ ...P.sfocAe, name: `${P.sfocAe.name} (${ae.label})` }, ae.sfocGPerKwh),
      rec(
        { ...P.fuelAe, name: `${P.fuelAe.name} (${ae.label})` },
        FUEL_LABELS[ae.fuel],
      ),
    );
  });

  rows.push(rec(P.nBoilers, form.boilers.length));

  form.boilers.forEach((b, i) => {
    rows.push(
      rec({ ...P.boilerKgH, name: `${P.boilerKgH.name} (${b.label})` }, b.consumptionKgPerH),
      rec(
        { ...P.fuelBoiler, name: `${P.fuelBoiler.name} (${b.label})` },
        FUEL_LABELS[b.fuel],
      ),
    );
  });

  for (const fuel of fuelsInUse(form)) {
    const design = form.serviceTankVolumeM3[fuel];
    rows.push(
      rec(
        { ...P.fuelDensity, name: `${P.fuelDensity.name} — ${FUEL_LABELS[fuel]}` },
        densityFor(fuel, form.fuelDensityKgM3),
      ),
      rec(
        { ...P.serviceTankVolume, name: `${P.serviceTankVolume.name} — ${FUEL_LABELS[fuel]}` },
        design != null && design > 0 ? design : "—",
      ),
    );
  }

  return rows;
}
