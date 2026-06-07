import type {
  FwAutonomy,
  SolidWasteCategory,
  SolidWasteCategoryResult,
  SolidWasteResult,
} from "./types";

export type { SolidWasteCategory };

export const SOLID_WASTE_CATEGORY_ORDER: SolidWasteCategory[] = [
  "plastics",
  "glass_tins",
  "food",
];

export const SOLID_WASTE_LABELS: Record<SolidWasteCategory, string> = {
  plastics: "Plastic",
  glass_tins: "Glass",
  food: "Food",
};

/** Generation rates (kg/person/day) — reference table from Excel_Makro (paper excluded). */
export const DEFAULT_RATES_KG_PER_PD: Record<SolidWasteCategory, number> = {
  plastics: 0.1,
  glass_tins: 1.0,
  food: 0.7,
};

export const BULK_DENSITY_NO_COMPACTOR_KG_M3: Record<SolidWasteCategory, number> = {
  plastics: 40,
  glass_tins: 160,
  food: 300,
};

export const BULK_DENSITY_WITH_COMPACTOR_KG_M3: Record<SolidWasteCategory, number> = {
  plastics: 410,
  glass_tins: 1600,
  food: 300,
};

export const INCINERATOR_VOLUME_REMAINING_FRACTION = 0.6;
export const INCINERATOR_CATEGORY_KEYS: SolidWasteCategory[] = [
  "plastics",
  "glass_tins",
  "food",
];

export const INCINERATOR_CATEGORY_LABELS = INCINERATOR_CATEGORY_KEYS.map(
  (key) => SOLID_WASTE_LABELS[key],
).join(", ");

function massToVolumeM3(
  massKg: Record<SolidWasteCategory, number>,
  bulkDensityKgM3: Record<SolidWasteCategory, number>,
): Record<SolidWasteCategory, number> {
  const out = {} as Record<SolidWasteCategory, number>;
  for (const key of SOLID_WASTE_CATEGORY_ORDER) {
    const rho = bulkDensityKgM3[key];
    out[key] = rho > 0 ? massKg[key] / rho : 0;
  }
  return out;
}

function applyIncineratorVolumeFactor(
  volumesM3: Record<SolidWasteCategory, number>,
): Record<SolidWasteCategory, number> {
  const out = { ...volumesM3 };
  for (const key of INCINERATOR_CATEGORY_KEYS) {
    out[key] = out[key] * INCINERATOR_VOLUME_REMAINING_FRACTION;
  }
  return out;
}

export function computeSolidWaste(
  personsOnBoard: number,
  period: FwAutonomy,
  withCompactor: boolean,
  incinerator: boolean,
): SolidWasteResult {
  const periodDays = period.days;
  const bulkDensity = withCompactor
    ? BULK_DENSITY_WITH_COMPACTOR_KG_M3
    : BULK_DENSITY_NO_COMPACTOR_KG_M3;

  const dailyMass = {} as Record<SolidWasteCategory, number>;
  const voyageMass = {} as Record<SolidWasteCategory, number>;

  for (const key of SOLID_WASTE_CATEGORY_ORDER) {
    const daily = DEFAULT_RATES_KG_PER_PD[key] * personsOnBoard;
    dailyMass[key] = daily;
    voyageMass[key] = daily * periodDays;
  }

  let dailyVolume = massToVolumeM3(dailyMass, bulkDensity);
  let voyageVolume = massToVolumeM3(voyageMass, bulkDensity);

  if (incinerator) {
    dailyVolume = applyIncineratorVolumeFactor(dailyVolume);
    voyageVolume = applyIncineratorVolumeFactor(voyageVolume);
  }

  const categories: SolidWasteCategoryResult[] = SOLID_WASTE_CATEGORY_ORDER.map((category) => ({
    category,
    label: SOLID_WASTE_LABELS[category],
    rateKgPerPersonDay: DEFAULT_RATES_KG_PER_PD[category],
    dailyMassKg: dailyMass[category],
    dailyVolumeM3: dailyVolume[category],
    voyageMassKg: voyageMass[category],
    voyageVolumeM3: voyageVolume[category],
  }));

  return {
    personsOnBoard,
    period,
    withCompactor,
    incinerator,
    categories,
  };
}
