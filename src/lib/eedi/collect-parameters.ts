import { FUEL_LABELS, type FuelType } from "./constants";
import type { MainEngineSpec } from "./calculation";
import {
  CAPACITY_MODE_OPTIONS,
  EEDI_PARAMS as P,
} from "./parameters";
import { CATEGORY_LABELS, type ShipCategory } from "./marpol-reg24";
import type { ParameterRecord } from "@/lib/parameters";

type CapMode = "dwt" | "dwt_containership_70" | "gt";

export type EediFormState = {
  shipName: string;
  vRef: number;
  capMode: CapMode;
  dwtInput: number;
  gtInput: number;
  capacityT: number;
  regCategory: ShipCategory;
  regGt: number;
  autoCf: boolean;
  shuttleRedundancy: boolean;
  fi: number;
  fc: number;
  fl: number;
  fw: number;
  fjProd: number;
  feff: number;
  nMe: number;
  mainEngines: MainEngineSpec[];
  sfcAe: number;
  fuelAe: FuelType;
  pAeOverride: string;
  nPto: number;
  ptoKw: number[];
  nPti: number;
  ptiKw: number[];
  peff: number;
  paeEff: number;
};

function rec(
  meta: { name: string; description: string },
  value: string | number | boolean,
): ParameterRecord {
  return { name: meta.name, value, description: meta.description };
}

/**
 * Reads all EEDI form fields into ParameterRecord[] (name · value · description).
 */
export function collectEediParameters(state: EediFormState): ParameterRecord[] {
  const capLabel =
    CAPACITY_MODE_OPTIONS.find((o) => o.value === state.capMode)?.label ?? state.capMode;

  const rows: ParameterRecord[] = [
    rec(P.shipName, state.shipName),
    rec(P.vRef, state.vRef),
    rec(P.capacityMode, capLabel),
    rec(P.dwt, state.dwtInput),
    rec(P.gt, state.capMode === "gt" ? state.gtInput : "—"),
    {
      name: "Capacity (attained)",
      value: state.capacityT,
      description: "Value used in EEDI denominator (t or GT per mode).",
    },
    rec(P.shipCategory, CATEGORY_LABELS[state.regCategory]),
    rec(P.regGt, state.regGt),
    rec(P.autoCorrectionFactors, state.autoCf),
    rec(P.shuttleRedundancy, state.shuttleRedundancy),
    rec(P.fi, state.fi),
    rec(P.fc, state.fc),
    rec(P.fl, state.fl),
    rec(P.fw, state.fw),
    rec(P.fjProduct, state.fjProd),
    rec(P.feffProduct, state.feff),
    rec(P.nMainEngines, state.nMe),
  ];

  state.mainEngines.forEach((me, i) => {
    rows.push(
      rec({ ...P.mcr, name: `${P.mcr.name} (ME ${i + 1})` }, me.mcrKw),
      rec({ ...P.sfcMe, name: `${P.sfcMe.name} (ME ${i + 1})` }, me.sfcGPerKwh),
      rec(
        { ...P.fuelMe, name: `${P.fuelMe.name} (ME ${i + 1})` },
        FUEL_LABELS[me.fuel],
      ),
    );
  });

  rows.push(
    rec(P.sfcAe, state.sfcAe),
    rec(P.fuelAe, FUEL_LABELS[state.fuelAe as keyof typeof FUEL_LABELS]),
    rec(P.pAe, state.pAeOverride.trim() || "(auto §2.2.5.6)"),
    rec(P.nPto, state.nPto),
  );

  state.ptoKw.forEach((kw, i) => {
    rows.push(rec({ ...P.ptoRated, name: `${P.ptoRated.name} ${i + 1}` }, kw));
  });

  rows.push(rec(P.nPti, state.nPti));

  state.ptiKw.forEach((kw, i) => {
    rows.push(rec({ ...P.pPti, name: `${P.pPti.name} ${i + 1}` }, kw));
  });

  rows.push(rec(P.pEff, state.peff), rec(P.pAeEff, state.paeEff));

  return rows;
}
