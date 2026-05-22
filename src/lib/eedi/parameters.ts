/** EEDI input parameter labels and descriptions (name · value · description). */

export const EEDI_PARAMS = {
  shipName: {
    name: "Ship / project name",
    description: "Identifier for this calculation (reporting only).",
  },
  vRef: {
    name: "V_ref",
    description:
      "Reference service speed (kn) at summer load draught, calm water — from speed–power curve or EEDI file.",
  },
  capacityMode: {
    name: "Capacity definition",
    description:
      "MEPC.308(73): Capacity in the attained EEDI denominator depends on ship type. Select the line that matches your vessel — wrong choice gives a wrong EEDI.",
  },
  dwt: {
    name: "DWT (t)",
    description:
      "100% summer deadweight (t) — Capacity in DWT modes; same value for Reg. 24 reference line (containership: Capacity = 70% × this DWT).",
  },
  gt: {
    name: "GT",
    description: "Gross tonnage from tonnage certificate — passenger / cruise ships.",
  },
  shipCategory: {
    name: "Ship type (Reg. 2)",
    description: "MARPOL Annex VI ship category for reference line and reduction factor.",
  },
  regGt: {
    name: "Reg. 24 GT",
    description: "Gross tonnage for cruise or ro-ro vehicle carrier reference line.",
  },
  autoCorrectionFactors: {
    name: "Auto-fill correction factors",
    description: "Apply MEPC.308 guideline defaults from selected ship type.",
  },
  shuttleRedundancy: {
    name: "Shuttle tanker redundancy",
    description: "Propulsion redundancy per 2.2.8.2 (80k–160k DWT tanker → f_j = 0.77).",
  },
  fi: {
    name: "f_i",
    description: "Capacity correction factor — ice class, CSR, VSE, etc.; default 1.0 if not applicable.",
  },
  fc: {
    name: "f_c",
    description: "Cubic capacity correction — chemical/LNG/ro-ro passenger/light bulk rules; default 1.0.",
  },
  fl: {
    name: "f_l",
    description: "General cargo cranes / gear — default 1.0 unless 2.2.14 applies.",
  },
  fw: {
    name: "f_w",
    description: "Weather / sea state — for Reg. 20/21 attained EEDI typically 1.00.",
  },
  fjProduct: {
    name: "Π f_j",
    description: "Product of all ship-type f_j factors (shuttle tanker, Ro-Ro, general cargo, etc.).",
  },
  feffProduct: {
    name: "Π f_eff",
    description: "Product of approved innovative-technology efficiency factors; 1.0 if none.",
  },
  nMainEngines: {
    name: "Number of main engines",
    description: "Count of main engines contributing to Σ P_ME at 75% MCR.",
  },
  mcr: {
    name: "MCR",
    description: "Main engine ISO rated maximum continuous rating (kW) — nameplate / EIAPP.",
  },
  sfcMe: {
    name: "SFC_ME",
    description: "Specific fuel consumption (g/kWh) at 75% MCR — from NOx Technical File.",
  },
  fuelMe: {
    name: "Fuel (ME)",
    description: "Main engine fuel type — sets CF from MEPC.308 Table 2.2.1.",
  },
  sfcAe: {
    name: "SFC_AE",
    description: "Auxiliary SFC (g/kWh) — D2/C1 often at 50% MCR per Technical File.",
  },
  fuelAe: {
    name: "Fuel (AE)",
    description: "Auxiliary engine fuel type for CF in P_AE term.",
  },
  pAe: {
    name: "P_AE",
    description:
      "Auxiliary engine power (kW). Leave empty to use §2.2.5.6 default from Σ MCR and P_PTI.",
  },
  nPto: {
    name: "Number of shaft generators (PTO)",
    description: "Shaft generators deducting from emission numerator at 0.75 × rated electrical kW.",
  },
  ptoRated: {
    name: "PTO rated electrical output",
    description: "Shaft generator rated electrical power (kW) — Option 1 capped by P_AE.",
  },
  nPti: {
    name: "Number of shaft motors (PTI)",
    description: "Shaft motors adding P_PTI term with averaged (SFC·CF) per Guidelines footnote.",
  },
  pPti: {
    name: "P_PTI",
    description: "Shaft motor power counted in EEDI (kW) per IMO definition.",
  },
  pEff: {
    name: "P_eff",
    description: "Innovative mechanical efficiency on main engine (kW) — default 0.",
  },
  pAeEff: {
    name: "P_AEeff",
    description: "Innovative auxiliary energy saving (kW) — default 0.",
  },
} as const;

export const CAPACITY_MODE_OPTIONS = [
  {
    value: "dwt" as const,
    label: "1. DWT (t)",
    whenToUse:
      "Default for most cargo ships: bulk carrier, tanker, gas carrier, LNG carrier, general cargo, refrigerated cargo, combination carrier, ro-ro cargo, ro-ro passenger, ro-ro vehicle carrier. Capacity = full summer deadweight (enter DWT below).",
  },
  {
    value: "dwt_containership_70" as const,
    label: "2. 70% × DWT",
    whenToUse:
      "Only for containerships (Regulation 2 definition). IMO requires Capacity = 70% of deadweight — enter full DWT; the calculator applies 0.7 automatically. Do not use for bulk, tanker, reefer, or ro-ro ships.",
  },
  {
    value: "gt" as const,
    label: "3. GT",
    whenToUse:
      "When Capacity is gross tonnage: cruise passenger ship (non-conventional propulsion), and other passenger ships where MEPC.308 / your class EEDI file defines Capacity as GT. Enter GT from the tonnage certificate; keep DWT for Reg. 24 reference line.",
  },
] as const;
