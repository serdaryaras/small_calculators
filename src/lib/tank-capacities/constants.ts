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

/** Default sludge discharge interval when autonomy / voyage not available (days). */
export const DEFAULT_SLUDGE_DAYS = 30;

/** Minimum wastewater holding period (days) — Tanklarv2 / BV practice. */
export const MIN_WASTEWATER_HOLDING_DAYS = 7;

/** MARPOL Annex I Reg.12 · MEPC.1/Circ.867 — K₁ with HFO purification. */
export const SLUDGE_K1_HFO_PURIFIED = 0.015;

/** MARPOL — K₁ for MDO / no purification. */
export const SLUDGE_K1_NO_PURIFICATION = 0.005;

/** MEPC.1/Circ.642 §7.5 — heated bilge holding note when HFO density exceeds this. */
export const HFO_DENSITY_REQUIRES_BILGE_HOLDING_KG_M3 = 940;
