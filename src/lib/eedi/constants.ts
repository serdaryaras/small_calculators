/** IMO MEPC.308(73) Table 2.2.1 — CF conversion factors (t-CO2/t-fuel). */

export type FuelType =
  | "diesel_gas_oil"
  | "light_fuel_oil"
  | "heavy_fuel_oil"
  | "lpg_propane"
  | "lpg_butane"
  | "lng"
  | "methanol"
  | "ethanol";

export const CF_BY_FUEL: Record<FuelType, number> = {
  diesel_gas_oil: 3.206,
  light_fuel_oil: 3.151,
  heavy_fuel_oil: 3.114,
  lpg_propane: 3.0,
  lpg_butane: 3.03,
  lng: 2.75,
  methanol: 1.375,
  ethanol: 1.913,
};

export const FUEL_LABELS: Record<FuelType, string> = {
  diesel_gas_oil: "Diesel / gas oil (ISO DMX–DMB)",
  light_fuel_oil: "Light fuel oil (ISO RMA–RMD)",
  heavy_fuel_oil: "Heavy fuel oil (ISO RME–RMK)",
  lpg_propane: "LPG (propane)",
  lpg_butane: "LPG (butane)",
  lng: "LNG",
  methanol: "Methanol",
  ethanol: "Ethanol",
};

export const FUEL_TYPES = Object.keys(CF_BY_FUEL) as FuelType[];
