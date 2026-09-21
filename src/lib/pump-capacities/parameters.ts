export const PUMP_PARAMS = {
  shipName: {
    name: "Ship / project name",
    description: "Identifier for this calculation (reporting only).",
  },
  shipType: {
    name: "Ship type",
    description:
      "Cargo, passenger or tanker — selects bilge diameter formula, pump count and fire VT tables (BV NR467).",
  },
  length: {
    name: "L — Length",
    description: "Rule length (m), Pt B Ch 1 Sec 2 — bilge main (cargo/passenger) and fire bilge reference.",
  },
  breadth: {
    name: "B — Breadth",
    description: "Moulded breadth (m).",
  },
  depth: {
    name: "D — Depth",
    description:
      "Moulded depth to bulkhead deck (m). Adjust per BV [6.8.1] if enclosed cargo on bulkhead deck.",
  },
  grossTonnage: {
    name: "Gross tonnage (GT)",
    description: "Fire pump number (VT1), hydrant pressure and emergency fire pump applicability.",
  },
  engineRoomLength: {
    name: "L₀ — Engine-room length",
    description:
      "Longitudinal extent of propulsion machinery space (m) — tanker bilge main: d = max(35 + 3√(L₀·(B+D)), d₁√2).",
  },
  useHoldBreadth: {
    name: "Double-hull cargo holds",
    description:
      "Side ballast tanks forming double hull on full hold length — main and non-machinery branches may use hold breadth amidships (BV [6.8.1] Note 1 · [6.8.3] b)). Cargo ships only.",
  },
  holdBreadthAmidships: {
    name: "B_hold — Hold breadth amidships",
    description: "Actual moulded breadth of cargo holds amidships (m) — replaces ship breadth B where allowed.",
  },
  fiveTiers: {
    name: "≥ 5 container tiers on/above weather deck",
    description: "Sets fire VT2 = 3 — mobile water monitors override the 180 m³/h cargo cap.",
  },
  firePumpsEqual: {
    name: "Fire pump capacities equal?",
    description:
      "Yes (default): each pump = total ÷ pump count. No: informational asymmetric floor (80% rule).",
  },
  passengerM: {
    name: "M — machinery volume below bulkhead deck",
    description: "Passenger bilge-pump numeral (Pt D Ch 11) — volume of machinery spaces (m³).",
  },
  passengerP: {
    name: "P — passenger spaces below bulkhead deck",
    description: "Volume of passenger spaces below bulkhead deck (m³).",
  },
  passengerV: {
    name: "V — total volume below bulkhead deck",
    description: "Total volume of the ship below the bulkhead deck (m³).",
  },
  passengerN: {
    name: "N — number of passengers",
    description: "Number of passengers for which the ship is certified.",
  },
  passengerPAbove: {
    name: "P_above — passenger spaces above bulkhead deck",
    description: "Volume of passenger spaces above the bulkhead deck (m³).",
  },
  bilgeCompartmentCount: {
    name: "Number of bilge branch compartments",
    description:
      "Compartments for branch suction sizing — d₁ = max(50, 25 + 2.16√(L₁·(B+D))) mm (no 100 mm cap).",
  },
  bilgeCompartmentLabel: {
    name: "Compartment label",
    description: "Identifier for report (e.g. Hold 1, ER, Bosun store).",
  },
  bilgeCompartmentLength: {
    name: "Compartment length L₁",
    description: "Longitudinal length of compartment (m).",
  },
  bilgeCompartmentMachinery: {
    name: "Machinery space",
    description:
      "Machinery branches always use ship breadth B; other branches use B_hold when double-hull is enabled.",
  },
} as const;
