export const PIPE_FLOW_PARAMS = {
  flowM3H: {
    name: "Flow rate Q",
    description: "Volumetric flow rate (m³/h).",
    unit: "m³/h",
  },
  diameterMm: {
    name: "Internal diameter d",
    description: "Pipe internal diameter (mm).",
    unit: "mm",
  },
  velocityMs: {
    name: "Velocity v",
    description: "Mean fluid velocity (m/s).",
    unit: "m/s",
  },
} as const;
