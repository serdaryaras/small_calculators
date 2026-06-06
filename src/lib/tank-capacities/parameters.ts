export const TANK_PARAMS = {
  shipName: {
    name: "Ship / project name",
    description: "Identifier for this calculation (reporting only).",
  },
  vs: {
    name: "V_s",
    description: "Ship service speed (kn) used with range to obtain voyage duration.",
  },
  range: {
    name: "Range",
    description: "Design range at service speed (nautical miles).",
  },
  endurance: {
    name: "Endurance",
    description:
      "Total autonomy period (days). Reserved for fresh water, sewage and hotel-load sections.",
  },
  nonDischargePeriod: {
    name: "Non-discharge period",
    description:
      "Period without discharge to sea (days). Reserved for sewage / holding-tank sizing.",
  },
  nMainEngines: {
    name: "Number of main engines",
    description: "Main propulsion engines consuming fuel during the range voyage.",
  },
  powerMe: {
    name: "Service power",
    description: "Brake power at service speed (kW) for fuel consumption.",
  },
  sfocMe: {
    name: "SFOC",
    description: "Specific fuel oil consumption (g/kWh) at the stated service power.",
  },
  fuelMe: {
    name: "Fuel type",
    description: "Fuel grade used by this engine.",
  },
  nAuxEngines: {
    name: "Number of auxiliary engines",
    description: "Auxiliary / diesel-generator sets running during the voyage.",
  },
  powerAe: {
    name: "Service power",
    description: "Electrical or brake power during voyage (kW).",
  },
  sfocAe: {
    name: "SFOC",
    description: "Specific fuel oil consumption (g/kWh).",
  },
  fuelAe: {
    name: "Fuel type",
    description: "Fuel grade used by this auxiliary engine.",
  },
  nBoilers: {
    name: "Number of boilers",
    description: "Boilers, thermal oil heaters or similar firing during the voyage.",
  },
  boilerKgH: {
    name: "Fuel consumption",
    description: "Fuel oil consumption (kg/h) at voyage service load.",
  },
  fuelBoiler: {
    name: "Fuel type",
    description: "Fuel grade fired in this boiler.",
  },
  fuelDensity: {
    name: "Fuel density",
    description: "Density at 15 °C (kg/m³) used to convert mass to storage volume.",
  },
  serviceTankVolume: {
    name: "Design service-tank volume",
    description:
      "Installed capacity of one service tank for this fuel (m³). Compared against 8 h consumption.",
  },
} as const;
