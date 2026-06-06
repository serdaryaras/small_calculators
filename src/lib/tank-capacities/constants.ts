import {
  FUEL_LABELS,
  FUEL_TYPES,
  type FuelType,
} from "@/lib/eedi/constants";

export { FUEL_LABELS, FUEL_TYPES, type FuelType };

/** Typical fuel density at 15 °C (kg/m³). Editable per calculation. */
export const DEFAULT_FUEL_DENSITY_KG_M3: Record<FuelType, number> = {
  diesel_gas_oil: 850,
  light_fuel_oil: 900,
  heavy_fuel_oil: 991,
  lpg_propane: 500,
  lpg_butane: 540,
  lng: 450,
  methanol: 792,
  ethanol: 789,
};

/** Minimum service-tank autonomy (hours). */
export const SERVICE_TANK_HOURS = 8;
