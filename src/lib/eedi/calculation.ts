/** Attained EEDI — IMO MEPC.308(73) §2.1 (conventional main + auxiliary engines). */

import { CF_BY_FUEL, type FuelType } from "./constants";

export type MainEngineSpec = {
  mcrKw: number;
  sfcGPerKwh: number;
  fuel: FuelType;
};

export type ShaftMotorSpec = {
  pPtiKw: number;
};

export type ShaftGeneratorSpec = {
  ratedElKw: number;
};

export type EediInputs = {
  vRefKn: number;
  capacityT: number;
  mainEngines: MainEngineSpec[];
  pAeKw?: number | null;
  sfcAeGPerKwh: number;
  fuelAe: FuelType;
  shaftGenerators?: ShaftGeneratorSpec[];
  shaftMotors?: ShaftMotorSpec[];
  innovativePeffKw?: number;
  innovativePaeEffKw?: number;
  fi?: number;
  fc?: number;
  fl?: number;
  fw?: number;
  fjProduct?: number;
  feffProduct?: number;
};

export type EediBreakdown = {
  attainedEedi: number;
  numeratorGco2PerH: number;
  denominatorTNmPerH: number;
  pAeKw: number;
  pMeItemsKw: number[];
  pPtoKw: number[];
  pPtiKw: number[];
  notes: string[];
};

function paeDefaultKw(mcrSumKw: number, ptiSumKw: number): number {
  const pPr = mcrSumKw + 0.75 * ptiSumKw;
  if (pPr >= 10_000) return 250 + 0.025 * pPr;
  return 0.05 * pPr;
}

function ptiEmissionFactorGPerKwh(
  meParts: [number, number, number][],
  sfcAe: number,
  cfAe: number,
): number {
  const pMeTotal = meParts.reduce((s, [p]) => s + p, 0);
  if (pMeTotal <= 0) return sfcAe * cfAe;
  const meProd =
    meParts.reduce((s, [p, sfc, cf]) => s + p * sfc * cf, 0) / pMeTotal;
  return 0.5 * (meProd + sfcAe * cfAe);
}

export function computeEedi(inp: EediInputs): EediBreakdown {
  if (!inp.mainEngines.length) {
    throw new Error("At least one main engine must be defined.");
  }

  const notes: string[] = [];
  const mcrSum = inp.mainEngines.reduce((s, e) => s + e.mcrKw, 0);
  const shaftMotors = inp.shaftMotors ?? [];
  const shaftGenerators = inp.shaftGenerators ?? [];
  const ptiList = shaftMotors.map((s) => s.pPtiKw);
  const ptiSum = ptiList.reduce((s, p) => s + p, 0);

  const pAe = inp.pAeKw ?? paeDefaultKw(mcrSum, ptiSum);
  if (inp.pAeKw == null) {
    notes.push("PAE was calculated using the default formula in MEPC.308(73) §2.2.5.6.");
  }

  const pPto = shaftGenerators.map((sg) => 0.75 * sg.ratedElKw);
  const ptoTotal = pPto.reduce((s, p) => s + p, 0);
  let pPtoEff: number[];
  if (ptoTotal > pAe + 1e-6) {
    notes.push(
      `Warning: Σ P_PTO (${ptoTotal.toFixed(1)} kW) exceeds P_AE (${pAe.toFixed(1)} kW); ` +
        "under IMO Option 1 the PTO deduction is capped by P_AE — PTO effect scaled down.",
    );
    const scale = ptoTotal > 0 ? pAe / ptoTotal : 0;
    pPtoEff = pPto.map((p) => p * scale);
  } else {
    pPtoEff = [...pPto];
  }

  const pMeI = inp.mainEngines.map((e) => 0.75 * e.mcrKw);
  const meParts: [number, number, number][] = pMeI.map((p, i) => [
    p,
    inp.mainEngines[i].sfcGPerKwh,
    CF_BY_FUEL[inp.mainEngines[i].fuel],
  ]);

  const cfAe = CF_BY_FUEL[inp.fuelAe];
  let emission = 0;

  for (const [p, sfc, cf] of meParts) {
    emission += p * sfc * cf;
  }

  const peff = inp.innovativePeffKw ?? 0;
  if (peff > 0 && meParts.length) {
    const pTotal = meParts.reduce((s, [p]) => s + p, 0);
    const wSfc =
      meParts.reduce((s, [p, sfc, cf]) => s + p * sfc * cf, 0) / pTotal;
    emission -= peff * wSfc;
  }

  emission += pAe * inp.sfcAeGPerKwh * cfAe;

  const paeEff = inp.innovativePaeEffKw ?? 0;
  if (paeEff > 0) {
    emission -= paeEff * inp.sfcAeGPerKwh * cfAe;
  }

  for (const ptoKw of pPtoEff) {
    if (ptoKw <= 0) continue;
    const eRef = inp.mainEngines[0];
    emission -= ptoKw * eRef.sfcGPerKwh * CF_BY_FUEL[eRef.fuel];
  }

  if (ptiList.length) {
    const wProd = ptiEmissionFactorGPerKwh(meParts, inp.sfcAeGPerKwh, cfAe);
    for (const pti of ptiList) {
      emission += pti * wProd;
    }
  }

  const fi = inp.fi ?? 1;
  const fc = inp.fc ?? 1;
  const fl = inp.fl ?? 1;
  const fw = inp.fw ?? 1;
  const fjProduct = inp.fjProduct ?? 1;
  const feffProduct = inp.feffProduct ?? 1;

  const denomCore = fi * fc * fl * inp.capacityT * inp.vRefKn * fw;
  if (denomCore <= 0) {
    throw new Error(
      "Denominator (f_i·f_c·f_l·Capacity·V_ref·f_w) must be positive.",
    );
  }

  const emissionEff = feffProduct * fjProduct * emission;
  const attained = emissionEff / denomCore;

  return {
    attainedEedi: attained,
    numeratorGco2PerH: emissionEff,
    denominatorTNmPerH: denomCore,
    pAeKw: pAe,
    pMeItemsKw: pMeI,
    pPtoKw: pPtoEff,
    pPtiKw: [...ptiList],
    notes,
  };
}
