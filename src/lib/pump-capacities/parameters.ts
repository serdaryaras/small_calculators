export const PUMP_PARAMS = {
  shipName: {
    name: "Ship / project name",
    description: "Identifier for this calculation (reporting only).",
  },
  shipType: {
    name: "Ship type",
    description:
      "Cargo or passenger — selects bilge pump count and fire capacity formula (BV / SOLAS).",
  },
  length: {
    name: "L — Length",
    description: "Principal length (m), Pt B, Ch 1, Sec 2 — bilge main diameter.",
  },
  breadth: {
    name: "B — Breadth",
    description: "Moulded breadth (m) — bilge main diameter.",
  },
  depth: {
    name: "D — Depth",
    description:
      "Moulded depth to bulkhead deck (m) — bilge main diameter. Adjust per BV [6.8.1] if enclosed cargo on bulkhead deck.",
  },
  grossTonnage: {
    name: "Gross tonnage (GT)",
    description:
      "Used for minimum fire pump count and emergency fire pump absolute minimum (FSS Code Ch.12).",
  },
  shortCargoShip: {
    name: "Cargo ship L < 35 m",
    description:
      "BV [6.7.4] Note 1 — reduced bilge pump formula (0.00345×d², 1.22 m/s). Auto-set when L < 35 m.",
  },
  containerTiers5Plus: {
    name: "Container ship ≥ 5 tiers on weather deck",
    description:
      "IACS UI SC270 — emergency fire pump total may be capped at 72 m³/h when monitors on separate system.",
  },
  firePumpsEqual: {
    name: "Fire pump capacities equal?",
    description:
      "Yes (default): each pump = total ÷ pump count. No: optional hint for smallest pump and others (excess ÷ remaining count).",
  },
} as const;
