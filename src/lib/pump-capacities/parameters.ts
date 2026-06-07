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
  isTanker: {
    name: "Tanker — machinery-space bilge only",
    description:
      "Oil / chemical tanker where ER bilge pumps do not drain cargo area — Pt C [6.8.9] · Pt D, Ch 7, Sec 4.",
  },
  machinerySpaceLength: {
    name: "Machinery space length C",
    description:
      "Longitudinal extent of propulsion machinery space (m) — tanker ER bilge main: d = 25 + 2.16√(C·(B+D)).",
  },
  doubleHullCargoHolds: {
    name: "Double-hull cargo holds",
    description:
      "Side ballast tanks forming double hull on full hold length — bilge main and hold branches may use hold breadth amidships (BV [6.8.1] Note 1 · [6.8.3] b)).",
  },
  holdBreadthAmidships: {
    name: "Hold breadth amidships B_hold",
    description: "Actual moulded breadth of cargo holds amidships (m) — replaces ship breadth B in hold bilge formulas.",
  },
  bilgeCompartmentCount: {
    name: "Number of bilge branch compartments",
    description:
      "Compartments for branch bilge suction pipe sizing — d₁ = 25 + 2.16√(L₁·(B+D)), min 50 mm, max 100 mm (BV [6.8.3]).",
  },
  bilgeCompartmentLabel: {
    name: "Compartment label",
    description: "Identifier for report (e.g. Hold 1, ER, Bosun store).",
  },
  bilgeCompartmentLength: {
    name: "Compartment length L₁",
    description: "Longitudinal length of compartment (m) — branch bilge suction formula.",
  },
  bilgeCompartmentKind: {
    name: "Compartment type",
    description:
      "Cargo hold branches use B_hold when double-hull option is enabled; machinery / other use ship breadth B.",
  },
} as const;
