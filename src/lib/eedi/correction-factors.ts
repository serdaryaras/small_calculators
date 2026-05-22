/** MEPC.308(73) guideline-driven correction factor defaults. */

import type { ShipCategory } from "./marpol-reg24";

export type CorrectionFactorInputs = {
  category: ShipCategory;
  dwt: number;
  vRefKn: number;
  shuttleTankerRedundancy?: boolean;
  useRoroFjFormula?: boolean;
  roroLppM?: number | null;
  roroBM?: number | null;
  roroDraftM?: number | null;
  roroDispM3?: number | null;
  useGeneralCargoFjFormula?: boolean;
  generalCargoCb?: number | null;
  generalCargoDispM3?: number | null;
  isChemicalTanker?: boolean;
  chemicalCargoTankM3?: number | null;
  isLngGasCarrierDdp?: boolean;
  gasCargoTankM3?: number | null;
  useRoropaxFcFormula?: boolean;
  roroPassengerGtForFc?: number | null;
  useBulkLightFcFormula?: boolean;
  bulkCargoHoldM3?: number | null;
  iceClass?: string | null;
  fiCbOverride?: number | null;
  useFiVse?: boolean;
  dwtReferenceDesign?: number | null;
  dwtEnhancedDesign?: number | null;
  useFiCsr?: boolean;
  lwtCsrT?: number | null;
  useFlCranes?: boolean;
  fCranes?: number | null;
};

export type CorrectionFactors = {
  fi: number;
  fc: number;
  fl: number;
  fw: number;
  fj: number;
  feff: number;
};

export function suggestedCorrectionFactors(
  inp: CorrectionFactorInputs,
): { factors: CorrectionFactors; notes: string[] } {
  const factors: CorrectionFactors = {
    fi: 1,
    fc: 1,
    fl: 1,
    fw: 1,
    fj: 1,
    feff: 1,
  };
  const notes: string[] = [
    "2.2.8.5: For other ship types, f_j = 1.0.",
    "2.2.11.4: For other ship types, f_i = 1.0.",
    "2.2.9.1: For attained EEDI under Reg.20/21, f_w = 1.00.",
  ];

  const { category, dwt, vRefKn } = inp;

  if (category === "tanker" && inp.shuttleTankerRedundancy) {
    if (dwt >= 80_000 && dwt <= 160_000) {
      factors.fj = 0.77;
      notes.push(
        "2.2.8.2: Shuttle tanker with propulsion redundancy (80k–160k DWT) => f_j = 0.77.",
      );
    } else {
      notes.push(
        "Shuttle tanker redundancy selected, but DWT is outside 80k–160k band; f_j kept at 1.0.",
      );
    }
  }

  if (
    (category === "roro_cargo" || category === "roro_passenger") &&
    inp.useRoroFjFormula
  ) {
    const { roroLppM, roroBM, roroDraftM, roroDispM3 } = inp;
    if (
      roroLppM &&
      roroBM &&
      roroDraftM &&
      roroDispM3 &&
      roroLppM > 0 &&
      roroBM > 0 &&
      roroDraftM > 0 &&
      roroDispM3 > 0
    ) {
      const alpha = category === "roro_cargo" ? 2 : 2.5;
      const beta = 0.5;
      const gamma = 0.75;
      const delta = 1;
      const fnL = (0.5144 * vRefKn) / Math.sqrt(9.81 * roroLppM);
      const fjRoro =
        fnL ** alpha *
        (roroLppM / roroBM) ** beta *
        (roroBM / roroDraftM) ** gamma *
        (roroLppM / roroDispM3 ** (1 / 3)) ** delta;
      factors.fj = Math.min(fjRoro, 1);
      notes.push(
        `2.2.8.3: fjRoRo computed from Lpp/B/d/displacement and Vref -> f_j = ${factors.fj.toFixed(4)}.`,
      );
    } else {
      notes.push(
        "2.2.8.3 applies, but Lpp/B/d/displacement inputs are incomplete; f_j kept at 1.0.",
      );
    }
  }

  if (category === "general_cargo" && inp.useGeneralCargoFjFormula) {
    const { generalCargoCb, generalCargoDispM3 } = inp;
    if (
      generalCargoCb != null &&
      generalCargoDispM3 != null &&
      generalCargoDispM3 > 0
    ) {
      let fnDisp =
        (0.5144 * vRefKn) /
        (Math.sqrt(9.81) * generalCargoDispM3 ** (1 / 6));
      fnDisp = Math.min(fnDisp, 0.6);
      const fjGeneral = 0.174 / (generalCargoCb ** 2.3 * fnDisp ** 0.3);
      factors.fj = Math.min(fjGeneral, 1);
      notes.push(
        `2.2.8.4: general cargo fj computed with Cb and Fn∇ (capped at 0.6) -> f_j = ${factors.fj.toFixed(4)}.`,
      );
    } else {
      notes.push(
        "2.2.8.4 applies, but Cb/displacement inputs are incomplete; f_j kept at 1.0.",
      );
    }
  }

  if (category === "tanker" && inp.isChemicalTanker) {
    const vt = inp.chemicalCargoTankM3;
    if (vt != null && vt > 0) {
      const r = dwt / vt;
      factors.fc = r < 0.98 ? r ** -0.7 - 0.014 : 1;
      notes.push(
        `2.2.12.1: chemical tanker fc from R=DWT/Vtank -> f_c = ${factors.fc.toFixed(4)}.`,
      );
    } else {
      notes.push("2.2.12.1 selected, but cargo tank volume is missing; f_c kept at 1.0.");
    }
  }

  if (category === "gas_carrier" && inp.isLngGasCarrierDdp) {
    const vt = inp.gasCargoTankM3;
    if (vt != null && vt > 0) {
      factors.fc = (dwt / vt) ** -0.56;
      notes.push(
        `2.2.12.2: LNG gas-carrier fc from R=DWT/Vtank -> f_c = ${factors.fc.toFixed(4)}.`,
      );
    } else {
      notes.push("2.2.12.2 selected, but cargo tank volume is missing; f_c kept at 1.0.");
    }
  }

  if (category === "roro_passenger" && inp.useRoropaxFcFormula) {
    const gtFc = inp.roroPassengerGtForFc;
    if (gtFc != null && gtFc > 0) {
      const ratio = dwt / gtFc;
      if (ratio < 0.25) {
        factors.fc = (ratio / 0.25) ** -0.8;
        notes.push(
          `2.2.12.3: ro-ro passenger fcRoPax (DWT/GT < 0.25) -> f_c = ${factors.fc.toFixed(4)}.`,
        );
      } else {
        factors.fc = 1;
        notes.push("2.2.12.3: DWT/GT >= 0.25, so fcRoPax is not applied and f_c = 1.0.");
      }
    } else {
      notes.push("2.2.12.3 applies, but GT is missing; f_c kept at 1.0.");
    }
  }

  if (category === "bulk_carrier" && inp.useBulkLightFcFormula) {
    const vhold = inp.bulkCargoHoldM3;
    if (vhold != null && vhold > 0) {
      const r = dwt / vhold;
      if (r < 0.55) {
        factors.fc = r ** -0.15;
        notes.push(
          `2.2.12.4: light-cargo bulk fc from R=DWT/Vhold -> f_c = ${factors.fc.toFixed(4)}.`,
        );
      } else {
        notes.push("2.2.12.4: R >= 0.55, so light-cargo bulk fc is not applied.");
      }
    } else {
      notes.push(
        "2.2.12.4 applies only if hold volume is provided; otherwise f_c stays 1.0.",
      );
    }
  }

  const ice = inp.iceClass;
  if (ice && ice !== "none") {
    let fiIce: number;
    if (ice === "IC") fiIce = 1.0041 + 58.5 / dwt;
    else if (ice === "IB") fiIce = 1.0067 + 62.7 / dwt;
    else if (ice === "IA") fiIce = 1.0099 + 95.1 / dwt;
    else fiIce = 1.0151 + 228.7 / dwt;

    const fiCb =
      inp.fiCbOverride != null && inp.fiCbOverride >= 1 ? inp.fiCbOverride : 1;
    factors.fi = fiIce * fiCb;
    notes.push(
      `2.2.11.1: ice-class fi = fi(ice class) * fiCb -> f_i = ${factors.fi.toFixed(4)}.`,
    );
    if (inp.fiCbOverride == null) {
      notes.push(
        "fiCb detailed formula needs hull-form data; fiCb defaulted to 1.0.",
      );
    }
  }

  if (inp.useFiVse) {
    const dRef = inp.dwtReferenceDesign;
    const dEnh = inp.dwtEnhancedDesign;
    if (dRef && dEnh && dRef > 0 && dEnh > 0) {
      factors.fi = dRef / dEnh;
      notes.push(
        `2.2.11.2: fiVSE from DWTreference/DWTenhance -> f_i = ${factors.fi.toFixed(4)}.`,
      );
    } else {
      notes.push(
        "2.2.11.2 selected, but DWT reference/enhanced inputs are incomplete.",
      );
    }
  }

  if (inp.useFiCsr) {
    const lwt = inp.lwtCsrT;
    if (lwt != null && lwt >= 0) {
      factors.fi = 1 + (0.08 * lwt) / dwt;
      notes.push(
        `2.2.11.3: fiCSR = 1 + 0.08*LWTCSR/DWTCSR -> f_i = ${factors.fi.toFixed(4)}.`,
      );
    } else {
      notes.push("2.2.11.3 selected, but LWTCSR is missing.");
    }
  }

  if (inp.useFlCranes && category === "general_cargo") {
    const fc = inp.fCranes;
    if (fc != null && fc > 0) {
      factors.fl = fc;
      notes.push(
        `2.2.14: for general cargo with cranes, f_l = f_cranes -> f_l = ${factors.fl.toFixed(4)}.`,
      );
    } else {
      notes.push("2.2.14 selected, but f_cranes missing; f_l kept at 1.0.");
    }
  }

  return { factors, notes };
}
