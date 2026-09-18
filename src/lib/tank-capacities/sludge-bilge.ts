import type { FuelType } from "@/lib/eedi/constants";
import {
  DEFAULT_SLUDGE_DAYS,
  HFO_DENSITY_REQUIRES_BILGE_HOLDING_KG_M3,
  SLUDGE_K1_HFO_PURIFIED,
  SLUDGE_K1_NO_PURIFICATION,
} from "./constants";
import type {
  EngineConsumer,
  FuelTypeBreakdown,
  OilyBilgeHolding,
  PeriodBasis,
  PeriodSource,
  SludgeK1Mode,
  SludgeTankResult,
} from "./types";

export function makePeriod(days: number, source: PeriodSource): PeriodBasis | null {
  if (!(days > 0) || !Number.isFinite(days)) return null;
  return { days, hours: days * 24, source };
}

export function resolveSludgePeriod(
  autonomyDays: number,
  voyageDays: number,
): PeriodBasis {
  if (autonomyDays > 0) {
    return makePeriod(autonomyDays, "autonomy")!;
  }
  if (voyageDays > 0) {
    return { days: voyageDays, hours: voyageDays * 24, source: "range_voyage" };
  }
  return makePeriod(DEFAULT_SLUDGE_DAYS, "default_30")!;
}

export function resolveSludgeK1(
  mode: SludgeK1Mode,
  mainEngines: EngineConsumer[],
): { k1: number; hfoPurified: boolean; source: "auto" | "manual" } {
  if (mode === "hfo_purified") {
    return { k1: SLUDGE_K1_HFO_PURIFIED, hfoPurified: true, source: "manual" };
  }
  if (mode === "diesel_or_no_purification") {
    return { k1: SLUDGE_K1_NO_PURIFICATION, hfoPurified: false, source: "manual" };
  }
  const hfoPurified = mainEngines.some(
    (e) => e.fuel === "heavy_fuel_oil" && e.powerKw > 0,
  );
  return {
    k1: hfoPurified ? SLUDGE_K1_HFO_PURIFIED : SLUDGE_K1_NO_PURIFICATION,
    hfoPurified,
    source: "auto",
  };
}

export function computeSludgeTank(
  dailyFuelM3: number,
  dischargeDays: number,
  k1: number,
): SludgeTankResult | null {
  if (!(dailyFuelM3 > 0) || !(dischargeDays > 0) || !(k1 > 0)) return null;
  return {
    k1,
    C: dailyFuelM3,
    D: dischargeDays,
    volumeM3: k1 * dailyFuelM3 * dischargeDays,
    rule: "MARPOL Annex I Reg. 12 · MEPC.1/Circ.867 item .4",
    formula: "V₁ = K₁ · C · D",
  };
}

export function mainEngineRatingKw(mainEngines: EngineConsumer[]): number {
  return mainEngines.reduce((sum, e) => sum + (e.powerKw > 0 ? e.powerKw : 0), 0);
}

export function computeOilyBilgeHolding(P: number): OilyBilgeHolding | null {
  if (!(P > 0)) return null;
  let volumeM3: number;
  let band: string;
  let formula: string;
  if (P <= 1000) {
    volumeM3 = 4;
    band = "P ≤ 1 000 kW";
    formula = "4 m³";
  } else if (P <= 20000) {
    volumeM3 = P / 250;
    band = "1 000 < P ≤ 20 000 kW";
    formula = "P / 250";
  } else {
    volumeM3 = 40 + P / 500;
    band = "P > 20 000 kW";
    formula = "40 + P / 500";
  }
  return {
    P,
    volumeM3,
    band,
    formula,
    rule: "MEPC.1/Circ.642 §8.3",
  };
}

export function dailyFuelConsumptionM3(breakdown24h: FuelTypeBreakdown[]): number {
  return breakdown24h.reduce((sum, row) => sum + row.volumeM3, 0);
}

export function oilyBilgeHeatingWarning(
  mainEngines: EngineConsumer[],
  fuelDensityKgM3: Partial<Record<FuelType, number>>,
  defaultDensity: Record<FuelType, number>,
): string | null {
  const usesHfo = mainEngines.some(
    (e) => e.fuel === "heavy_fuel_oil" && e.powerKw > 0,
  );
  if (!usesHfo) return null;
  const rho =
    fuelDensityKgM3.heavy_fuel_oil ?? defaultDensity.heavy_fuel_oil;
  if (rho > HFO_DENSITY_REQUIRES_BILGE_HOLDING_KG_M3) {
    return `HFO density ${rho} kg/m³ > ${HFO_DENSITY_REQUIRES_BILGE_HOLDING_KG_M3} kg/m³ — consider heated oily bilge holding (MEPC.1/Circ.642 §7.5).`;
  }
  return null;
}

export const SLUDGE_K1_OPTIONS: { value: SludgeK1Mode; label: string }[] = [
  { value: "auto", label: "Auto (HFO on ME → K₁ = 0.015)" },
  { value: "hfo_purified", label: "HFO purified — K₁ = 0.015" },
  {
    value: "diesel_or_no_purification",
    label: "MDO / no purification — K₁ = 0.005",
  },
];
