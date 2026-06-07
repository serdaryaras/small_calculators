"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalculatorPhase,
  ParameterCheckbox,
  ParameterField,
  ParameterNumberInput,
  ParameterSection,
  ParameterSelect,
  ParameterTextInput,
} from "@/components/ParameterField";
import { ToolLayout } from "@/components/ToolLayout";
import { FUEL_LABELS, FUEL_TYPES, type FuelType } from "@/lib/eedi/constants";
import {
  DEFAULT_FUEL_DENSITY_KG_M3,
  SERVICE_TANK_HOURS,
} from "@/lib/tank-capacities/constants";
import { TANK_PARAMS as P } from "@/lib/tank-capacities/parameters";
import type {
  BoilerConsumer,
  EngineConsumer,
  TankCapacitiesResult,
  WastewaterShipType,
  WastewaterTankId,
  WastewaterTankResult,
} from "@/lib/tank-capacities/types";
import {
  computeWastewater,
  WASTEWATER_SHIP_TYPES,
  wastewaterTankRateDescription,
} from "@/lib/tank-capacities/wastewater";
import {
  computeFreshWater,
  resolveFwAutonomy,
  resolveSewageHolding,
  voyageHours,
} from "@/lib/tank-capacities/calculation";
import {
  computeSolidWaste,
  INCINERATOR_CATEGORY_LABELS,
} from "@/lib/tank-capacities/solid-waste";
import { buildTankCapacitiesReport } from "@/lib/tank-capacities/build-report";
import { exportTankCapacitiesReportPdf } from "@/lib/tank-capacities/export-pdf";
import { calculateTankCapacitiesFromForm } from "@/lib/tank-capacities/validate-and-calculate";

function ResultValue({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-semibold tabular-nums text-[var(--accent)]">{children}</span>
  );
}

function fmt(n: number, digits = 1): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function fmtDuration(days: number, hours: number): string {
  return `${fmt(days, 1)} days (${fmt(hours, 0)} h)`;
}

const WASTEWATER_TANK_META: Record<
  WastewaterTankId,
  { tone: number; subtitle: string; badge: string }
> = {
  black: {
    tone: 5,
    badge: "Tank 1 — separate",
    subtitle: "Dedicated black-water holding tank — toilet waste only.",
  },
  gray: {
    tone: 6,
    badge: "Tank 2 — separate",
    subtitle: "Dedicated gray-water holding tank — gray water, laundry and galley combined.",
  },
};

function WastewaterTankFields({
  tank,
  personsOnBoard,
  holdingDays,
  preview,
}: {
  tank: WastewaterTankResult;
  personsOnBoard: number;
  holdingDays: number;
  preview?: boolean;
}) {
  const suffix = preview ? " (preview)" : "";

  return (
    <>
      <ParameterField
        name={`Daily generation${suffix}`}
        description={
          tank.id === "gray"
            ? `Gray + laundry + galley — ${wastewaterTankRateDescription(tank, personsOnBoard)}`
            : wastewaterTankRateDescription(tank, personsOnBoard)
        }
        value={
          <ResultValue>
            {fmt(tank.dailyLiters, 0)} L/day ({fmt(tank.dailyM3, 2)} m³/day)
          </ResultValue>
        }
      />
      {tank.id === "gray" && (
        <ul className="mb-2 space-y-0.5 border-b border-[var(--card-border)] px-1 pb-3 text-xs text-[var(--muted)]">
          {tank.components.map((c) => (
            <li key={c.stream}>
              {c.label}: {fmt(c.rateLPerPersonDay, 0)} L/person/day → {fmt(c.dailyLiters, 0)}{" "}
              L/day
            </li>
          ))}
        </ul>
      )}
      <ParameterField
        name={`Holding capacity${suffix}`}
        description={`This tank only — non-discharge period ${fmt(holdingDays, 1)} days`}
        value={
          <ResultValue>
            {fmt(tank.holdingLiters, 0)} L ({fmt(tank.holdingM3, 2)} m³)
          </ResultValue>
        }
      />
    </>
  );
}

function WastewaterTankPanel({
  tank,
  personsOnBoard,
  holdingDays,
  preview,
}: {
  tank: WastewaterTankResult;
  personsOnBoard: number;
  holdingDays: number;
  preview?: boolean;
}) {
  const meta = WASTEWATER_TANK_META[tank.id];

  if (preview) {
    return (
      <section
        className={`section-card section-card--tone-${meta.tone} my-4 overflow-hidden`}
      >
        <div className="section-card__header flex flex-wrap items-center justify-between gap-2">
          <span>{tank.label} tank</span>
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide dark:bg-white/10">
            {meta.badge}
          </span>
        </div>
        <p className="border-b border-[var(--card-border)] px-4 py-2 text-xs leading-relaxed text-[var(--muted)]">
          {meta.subtitle}
        </p>
        <div className="px-4">
          <WastewaterTankFields
            tank={tank}
            personsOnBoard={personsOnBoard}
            holdingDays={holdingDays}
            preview
          />
        </div>
      </section>
    );
  }

  return (
    <ParameterSection title={`${tank.label} tank`} tone={meta.tone}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--card-border)] py-3">
        <p className="text-xs leading-relaxed text-[var(--muted)]">{meta.subtitle}</p>
        <span className="shrink-0 rounded-full border border-[var(--card-border)] bg-[var(--background)] px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--foreground)]">
          {meta.badge}
        </span>
      </div>
      <WastewaterTankFields
        tank={tank}
        personsOnBoard={personsOnBoard}
        holdingDays={holdingDays}
      />
    </ParameterSection>
  );
}

const defaultMe: EngineConsumer = {
  label: "Main engine 1",
  powerKw: 6_000,
  sfocGPerKwh: 185,
  fuel: "heavy_fuel_oil",
};

const defaultAe: EngineConsumer = {
  label: "Auxiliary engine 1",
  powerKw: 800,
  sfocGPerKwh: 210,
  fuel: "diesel_gas_oil",
};

const defaultBoiler: BoilerConsumer = {
  label: "Boiler 1",
  consumptionKgPerH: 350,
  fuel: "heavy_fuel_oil",
};

export function TankCapacitiesCalculator() {
  const [shipName, setShipName] = useState("Newbuilding");
  const [vsKn, setVsKn] = useState(12);
  const [rangeNm, setRangeNm] = useState(6_000);
  const [enduranceDays, setEnduranceDays] = useState(10);
  const [nonDischargeDays, setNonDischargeDays] = useState(7);
  const [personsOnBoard, setPersonsOnBoard] = useState(15);
  const [shipType, setShipType] = useState<WastewaterShipType>(4);
  const [vacuumToilet, setVacuumToilet] = useState(false);
  const [withCompactor, setWithCompactor] = useState(false);
  const [solidWasteIncinerator, setSolidWasteIncinerator] = useState(false);

  const [nMe, setNMe] = useState(1);
  const [mainEngines, setMainEngines] = useState<EngineConsumer[]>([{ ...defaultMe }]);

  const [nAe, setNAe] = useState(2);
  const [auxiliaryEngines, setAuxiliaryEngines] = useState<EngineConsumer[]>([
    { ...defaultAe, label: "Auxiliary engine 1" },
    { ...defaultAe, label: "Auxiliary engine 2", powerKw: 600 },
  ]);

  const [nBoilers, setNBoilers] = useState(1);
  const [boilers, setBoilers] = useState<BoilerConsumer[]>([{ ...defaultBoiler }]);

  const [fuelDensity, setFuelDensity] = useState<Partial<Record<FuelType, number>>>({});
  const [serviceTankVolume, setServiceTankVolume] = useState<
    Partial<Record<FuelType, number>>
  >({});

  const [result, setResult] = useState<TankCapacitiesResult | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const previewHours = voyageHours(rangeNm, vsKn);
  const previewVoyageDays = previewHours / 24;
  const previewFw = resolveFwAutonomy(enduranceDays, previewVoyageDays);
  const previewSewage = resolveSewageHolding(nonDischargeDays);
  const previewWastewater = useMemo(
    () =>
      computeWastewater(
        shipType,
        vacuumToilet,
        personsOnBoard,
        nonDischargeDays,
      ),
    [shipType, vacuumToilet, personsOnBoard, nonDischargeDays],
  );
  const previewFreshWater = useMemo(
    () => computeFreshWater(previewWastewater, previewFw),
    [previewWastewater, previewFw],
  );
  const previewSolidWaste = useMemo(
    () =>
      computeSolidWaste(
        personsOnBoard,
        previewFw,
        withCompactor,
        solidWasteIncinerator,
      ),
    [personsOnBoard, previewFw, withCompactor, solidWasteIncinerator],
  );

  const fuelsInUse = useMemo(() => {
    const set = new Set<FuelType>();
    for (const e of mainEngines) set.add(e.fuel);
    for (const e of auxiliaryEngines) set.add(e.fuel);
    for (const b of boilers) if (b.consumptionKgPerH > 0) set.add(b.fuel);
    return FUEL_TYPES.filter((f) => set.has(f));
  }, [mainEngines, auxiliaryEngines, boilers]);

  const fuelOptions = FUEL_TYPES.map((f) => ({
    value: f,
    label: FUEL_LABELS[f],
  }));

  const syncEngines = (
    n: number,
    setter: (v: EngineConsumer[]) => void,
    prev: EngineConsumer[],
    prefix: string,
    template: EngineConsumer,
    max = 6,
  ) => {
    const count = Math.min(max, Math.max(0, Math.round(n)));
    const next = [...prev];
    while (next.length < count) {
      next.push({
        ...template,
        label: `${prefix} ${next.length + 1}`,
      });
    }
    setter(next.slice(0, count).map((e, i) => ({ ...e, label: `${prefix} ${i + 1}` })));
  };

  const syncBoilers = (n: number) => {
    const count = Math.min(6, Math.max(0, Math.round(n)));
    setBoilers((prev) => {
      const next = [...prev];
      while (next.length < count) {
        next.push({
          ...defaultBoiler,
          label: `Boiler ${next.length + 1}`,
        });
      }
      return next.slice(0, count).map((b, i) => ({ ...b, label: `Boiler ${i + 1}` }));
    });
  };

  const formState = useMemo(
    () => ({
      shipName,
      ship: {
        vsKn,
        rangeNm,
        enduranceDays,
        nonDischargePeriodDays: nonDischargeDays,
        personsOnBoard,
        shipType,
        vacuumToilet,
        withCompactor,
        solidWasteIncinerator,
      },
      mainEngines,
      auxiliaryEngines,
      boilers,
      fuelDensityKgM3: fuelDensity,
      serviceTankVolumeM3: serviceTankVolume,
    }),
    [
      shipName,
      vsKn,
      rangeNm,
      enduranceDays,
      nonDischargeDays,
      personsOnBoard,
      shipType,
      vacuumToilet,
      withCompactor,
      solidWasteIncinerator,
      mainEngines,
      auxiliaryEngines,
      boilers,
      fuelDensity,
      serviceTankVolume,
    ],
  );

  const reportData = useMemo(() => {
    if (!result) return null;
    return buildTankCapacitiesReport(formState, result, warnings, shipName);
  }, [result, formState, warnings, shipName]);

  const handleDownloadPdf = async () => {
    if (!reportData) return;
    setExportingPdf(true);
    try {
      await exportTankCapacitiesReportPdf(reportData);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleCalculate = () => {
    setError(null);
    setResult(null);
    setWarnings([]);
    setCalculating(true);
    try {
      const { result: r, warnings: w } = calculateTankCapacitiesFromForm(formState);
      setResult(r);
      setWarnings(w);
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCalculating(false);
    }
  };

  const densityFor = (fuel: FuelType) =>
    fuelDensity[fuel] ?? DEFAULT_FUEL_DENSITY_KG_M3[fuel];

  return (
    <ToolLayout
      title="Tank Capacities"
      description="Fuel tank capacities and waste holding volumes for ship design."
    >
      <p className="mb-2 text-sm text-[var(--muted)]">
        Each field follows: <strong>parameter name</strong> · <strong>value</strong> ·{" "}
        <strong>description</strong>.
      </p>

      <CalculatorPhase
        title="Input"
        description="Ship, machinery and fuel properties — edit values here."
      >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ParameterSection title="Ship" tone={0}>
            <ParameterTextInput
              name={P.shipName.name}
              description={P.shipName.description}
              value={shipName}
              onChange={setShipName}
            />
            <ParameterSelect
              name={P.shipType.name}
              description={P.shipType.description}
              value={String(shipType)}
              onChange={(v) => setShipType(Number(v) as WastewaterShipType)}
              options={WASTEWATER_SHIP_TYPES.map((t) => ({
                value: String(t.value),
                label: t.label,
              }))}
            />
            <ParameterNumberInput
              name={P.vs.name}
              description={P.vs.description}
              value={vsKn}
              onChange={setVsKn}
              min={0.1}
              step={0.1}
            />
            <ParameterNumberInput
              name={P.personsOnBoard.name}
              description={P.personsOnBoard.description}
              value={personsOnBoard}
              onChange={setPersonsOnBoard}
              min={1}
              step={1}
            />
            <ParameterNumberInput
              name={P.range.name}
              description={P.range.description}
              value={rangeNm}
              onChange={setRangeNm}
              min={1}
              step={100}
            />
            <ParameterNumberInput
              name={P.endurance.name}
              description={P.endurance.description}
              value={enduranceDays}
              onChange={setEnduranceDays}
              min={0}
              step={0.5}
              placeholder="0 = from range"
            />
            <ParameterNumberInput
              name={P.nonDischargePeriod.name}
              description={P.nonDischargePeriod.description}
              value={nonDischargeDays}
              onChange={setNonDischargeDays}
              min={0.1}
              step={0.5}
            />
            <ParameterCheckbox
              name={P.vacuumToilet.name}
              description={P.vacuumToilet.description}
              checked={vacuumToilet}
              onChange={setVacuumToilet}
            />
            <ParameterCheckbox
              name={P.withCompactor.name}
              description={P.withCompactor.description}
              checked={withCompactor}
              onChange={setWithCompactor}
            />
            <ParameterCheckbox
              name={P.solidWasteIncinerator.name}
              description={P.solidWasteIncinerator.description}
              checked={solidWasteIncinerator}
              onChange={setSolidWasteIncinerator}
            />
          </ParameterSection>

          <ParameterSection title="Fuel properties" tone={1}>
            {fuelsInUse.length === 0 ? (
              <p className="py-4 text-xs text-[var(--muted)]">
                Add consumers below to configure densities and service tanks.
              </p>
            ) : (
              fuelsInUse.map((fuel) => (
                <div key={fuel} className="border-t border-[var(--card-border)] first:border-t-0">
                  <p className="py-2 text-xs font-semibold uppercase text-[var(--muted)]">
                    {FUEL_LABELS[fuel]}
                  </p>
                  <ParameterNumberInput
                    name={`${P.fuelDensity.name} — ${FUEL_LABELS[fuel]}`}
                    description={P.fuelDensity.description}
                    value={densityFor(fuel)}
                    onChange={(v) =>
                      setFuelDensity((prev) => ({ ...prev, [fuel]: v }))
                    }
                    min={1}
                    step={1}
                  />
                  <ParameterNumberInput
                    name={`${P.serviceTankVolume.name} — ${FUEL_LABELS[fuel]}`}
                    description={P.serviceTankVolume.description}
                    value={serviceTankVolume[fuel] ?? 0}
                    onChange={(v) =>
                      setServiceTankVolume((prev) => ({ ...prev, [fuel]: v }))
                    }
                    min={0}
                    step={0.1}
                    placeholder="optional"
                  />
                </div>
              ))
            )}
          </ParameterSection>
        </div>

        <div className="space-y-6">
          <ParameterSection title="Main engines" tone={3}>
            <ParameterNumberInput
              name={P.nMainEngines.name}
              description={P.nMainEngines.description}
              value={nMe}
              onChange={(v) => {
                setNMe(v);
                syncEngines(v, setMainEngines, mainEngines, "Main engine", defaultMe);
              }}
              min={0}
              step={1}
            />
            {mainEngines.map((me, i) => (
              <div key={i} className="border-t border-[var(--card-border)]">
                <p className="py-2 text-xs font-semibold uppercase text-[var(--muted)]">
                  {me.label}
                </p>
                <ParameterNumberInput
                  name={`${P.powerMe.name} (${me.label})`}
                  description={P.powerMe.description}
                  value={me.powerKw}
                  onChange={(v) => {
                    const next = [...mainEngines];
                    next[i] = { ...next[i], powerKw: v };
                    setMainEngines(next);
                  }}
                  min={1}
                  step={100}
                />
                <ParameterNumberInput
                  name={`${P.sfocMe.name} (${me.label})`}
                  description={P.sfocMe.description}
                  value={me.sfocGPerKwh}
                  onChange={(v) => {
                    const next = [...mainEngines];
                    next[i] = { ...next[i], sfocGPerKwh: v };
                    setMainEngines(next);
                  }}
                  min={0.1}
                  step={0.1}
                />
                <ParameterSelect
                  name={`${P.fuelMe.name} (${me.label})`}
                  description={P.fuelMe.description}
                  value={me.fuel}
                  onChange={(f) => {
                    const next = [...mainEngines];
                    next[i] = { ...next[i], fuel: f };
                    setMainEngines(next);
                  }}
                  options={fuelOptions}
                />
              </div>
            ))}
          </ParameterSection>

          <ParameterSection title="Auxiliary engines" tone={4}>
            <ParameterNumberInput
              name={P.nAuxEngines.name}
              description={P.nAuxEngines.description}
              value={nAe}
              onChange={(v) => {
                setNAe(v);
                syncEngines(
                  v,
                  setAuxiliaryEngines,
                  auxiliaryEngines,
                  "Auxiliary engine",
                  defaultAe,
                );
              }}
              min={0}
              step={1}
            />
            {auxiliaryEngines.map((ae, i) => (
              <div key={i} className="border-t border-[var(--card-border)]">
                <p className="py-2 text-xs font-semibold uppercase text-[var(--muted)]">
                  {ae.label}
                </p>
                <ParameterNumberInput
                  name={`${P.powerAe.name} (${ae.label})`}
                  description={P.powerAe.description}
                  value={ae.powerKw}
                  onChange={(v) => {
                    const next = [...auxiliaryEngines];
                    next[i] = { ...next[i], powerKw: v };
                    setAuxiliaryEngines(next);
                  }}
                  min={1}
                  step={10}
                />
                <ParameterNumberInput
                  name={`${P.sfocAe.name} (${ae.label})`}
                  description={P.sfocAe.description}
                  value={ae.sfocGPerKwh}
                  onChange={(v) => {
                    const next = [...auxiliaryEngines];
                    next[i] = { ...next[i], sfocGPerKwh: v };
                    setAuxiliaryEngines(next);
                  }}
                  min={0.1}
                  step={0.1}
                />
                <ParameterSelect
                  name={`${P.fuelAe.name} (${ae.label})`}
                  description={P.fuelAe.description}
                  value={ae.fuel}
                  onChange={(f) => {
                    const next = [...auxiliaryEngines];
                    next[i] = { ...next[i], fuel: f };
                    setAuxiliaryEngines(next);
                  }}
                  options={fuelOptions}
                />
              </div>
            ))}
          </ParameterSection>

          <ParameterSection title="Boilers" tone={2}>
            <ParameterNumberInput
              name={P.nBoilers.name}
              description={P.nBoilers.description}
              value={nBoilers}
              onChange={(v) => {
                setNBoilers(v);
                syncBoilers(v);
              }}
              min={0}
              step={1}
            />
            {boilers.map((b, i) => (
              <div key={i} className="border-t border-[var(--card-border)]">
                <p className="py-2 text-xs font-semibold uppercase text-[var(--muted)]">
                  {b.label}
                </p>
                <ParameterNumberInput
                  name={`${P.boilerKgH.name} (${b.label})`}
                  description={P.boilerKgH.description}
                  value={b.consumptionKgPerH}
                  onChange={(v) => {
                    const next = [...boilers];
                    next[i] = { ...next[i], consumptionKgPerH: v };
                    setBoilers(next);
                  }}
                  min={0}
                  step={10}
                />
                <ParameterSelect
                  name={`${P.fuelBoiler.name} (${b.label})`}
                  description={P.fuelBoiler.description}
                  value={b.fuel}
                  onChange={(f) => {
                    const next = [...boilers];
                    next[i] = { ...next[i], fuel: f };
                    setBoilers(next);
                  }}
                  options={fuelOptions}
                />
              </div>
            ))}
          </ParameterSection>
        </div>
      </div>
      </CalculatorPhase>

      <CalculatorPhase
        title="Preview"
        description="Live estimates from current inputs — updates as you type."
      >
        <ParameterSection title="Time bases" tone={5}>
          <ParameterField
            name="Voyage duration"
            description="Range ÷ V_s — total fuel-oil quantity at range."
            value={
              <ResultValue>
                {fmtDuration(previewVoyageDays, previewHours)}
              </ResultValue>
            }
          />
          <ParameterField
            name="FW autonomy"
            description={
              previewFw.source === "endurance"
                ? "From Endurance — fresh-water and solid-waste stowage period."
                : "Endurance is 0 — using voyage time (Range ÷ V_s)."
            }
            value={
              <ResultValue>
                {fmtDuration(previewFw.days, previewFw.hours)}
              </ResultValue>
            }
          />
          <ParameterField
            name="Sewage holding"
            description="From Non-discharge period — holding-tank capacity."
            value={
              <ResultValue>
                {fmtDuration(previewSewage.days, previewSewage.hours)}
              </ResultValue>
            }
          />
        </ParameterSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <ParameterSection title="Wastewater & FW" tone={4}>
            {previewWastewater.tanks.map((tank) => (
              <WastewaterTankPanel
                key={tank.id}
                tank={tank}
                personsOnBoard={personsOnBoard}
                holdingDays={nonDischargeDays}
                preview
              />
            ))}
            <ParameterField
              name="Wastewater total"
              description="Black-water + gray-water tanks — daily generation."
              value={
                <ResultValue>
                  {fmt(previewWastewater.totalDailyLiters, 0)} L/day (
                  {fmt(previewWastewater.totalDailyM3, 2)} m³/day)
                </ResultValue>
              }
            />
            <ParameterField
              name="Holding total"
              description={`Black + gray tanks over non-discharge period (${fmt(nonDischargeDays, 1)} days).`}
              value={
                <ResultValue>
                  {fmt(previewWastewater.totalHoldingLiters, 0)} L (
                  {fmt(previewWastewater.totalHoldingM3, 2)} m³)
                </ResultValue>
              }
            />
            <ParameterField
              name="FW daily demand"
              description="Equals total daily wastewater."
              value={
                <ResultValue>
                  {fmt(previewFreshWater.dailyLiters, 0)} L/day (
                  {fmt(previewFreshWater.dailyM3, 2)} m³/day)
                </ResultValue>
              }
            />
            <ParameterField
              name="FW tank capacity"
              description={`Daily FW × FW autonomy (${fmt(previewFw.days, 1)} days).`}
              value={
                <ResultValue>
                  {fmt(previewFreshWater.tankLiters, 0)} L (
                  {fmt(previewFreshWater.tankM3, 2)} m³)
                </ResultValue>
              }
            />
          </ParameterSection>

          <ParameterSection title="Solid waste" tone={7}>
            <p className="border-b border-[var(--card-border)] px-0 py-3 text-xs leading-relaxed text-[var(--muted)]">
              Stowage over FW autonomy ({fmt(previewFw.days, 1)} days).
              {withCompactor ? " Compactor in use." : ""}
              {solidWasteIncinerator
                ? ` Incinerator: ${INCINERATOR_CATEGORY_LABELS} volume × 0.6.`
                : ""}
            </p>
            {previewSolidWaste.categories.map((row) => (
              <div
                key={row.category}
                className="border-b border-[var(--card-border)] py-4 last:border-b-0"
              >
                <ParameterField
                  name={row.label}
                  description={`${fmt(row.rateKgPerPersonDay, 1)} kg/person/day × ${personsOnBoard} persons`}
                  value={
                    <ResultValue>
                      {fmt(row.dailyMassKg, 1)} kg/day · {fmt(row.dailyVolumeM3, 1)} m³/day
                    </ResultValue>
                  }
                />
                <ParameterField
                  name={`${row.label} — stowage`}
                  description={`Over endurance period (${fmt(previewFw.days, 1)} days)`}
                  value={
                    <ResultValue>
                      {fmt(row.voyageMassKg, 1)} kg · {fmt(row.voyageVolumeM3, 1)} m³
                    </ResultValue>
                  }
                />
              </div>
            ))}
          </ParameterSection>
        </div>
      </CalculatorPhase>

      <CalculatorPhase
        title="Results"
        description="Full calculation after Calculate — includes fuel at range and service-tank checks."
      >
        <div className="no-print flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCalculate}
            disabled={calculating}
            className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {calculating ? "Calculating…" : "Calculate tank capacities"}
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!reportData || exportingPdf}
            className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {exportingPdf ? "PDF…" : "Download PDF"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            <p className="font-medium">Cannot calculate — fix the following:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {error.split("\n").map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            {warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}

        {!result && !error && (
          <p className="text-sm text-[var(--muted)]">
            Press <strong>Calculate tank capacities</strong> to generate results.
          </p>
        )}

        {result && (
        <div ref={resultsRef} className="space-y-6">
          <ParameterSection title={`Results — ${shipName || "Project"}`} tone={5}>
            <ParameterField
              name="Voyage duration"
              description="Time to cover design range at service speed."
              value={
                <ResultValue>
                  {fmtDuration(result.voyageDays, result.voyageHours)}
                </ResultValue>
              }
            />
            <ParameterField
              name="Total fuel (all grades)"
              description="Sum of fuel oil required for the range voyage."
              value={
                <ResultValue>
                  {fmt(result.totalFuelMassKg / 1000, 1)} t · {fmt(result.totalFuelVolumeM3, 1)}{" "}
                  m³
                </ResultValue>
              }
            />
            <ParameterField
              name="FW autonomy"
              description={
                result.fwAutonomy.source === "endurance"
                  ? "From Endurance — fresh-water tank sizing period."
                  : "From Range ÷ V_s (Endurance not set) — fresh-water tank sizing period."
              }
              value={
                <ResultValue>
                  {fmtDuration(result.fwAutonomy.days, result.fwAutonomy.hours)}
                </ResultValue>
              }
            />
            <ParameterField
              name="Sewage holding period"
              description="From Non-discharge period — holding-tank sizing period."
              value={
                <ResultValue>
                  {fmtDuration(result.sewageHolding.days, result.sewageHolding.hours)}
                </ResultValue>
              }
            />
          </ParameterSection>

          <ParameterSection title="Fresh water" tone={3}>
            <p className="border-b border-[var(--card-border)] px-0 py-3 text-xs leading-relaxed text-[var(--muted)]">
              Daily FW demand equals total daily wastewater. FW can be replenished over the
              Endurance period only — tank capacity = daily demand × FW autonomy.
            </p>
            <ParameterField
              name="FW daily demand"
              description="Equals total daily wastewater generation."
              value={
                <ResultValue>
                  {fmt(result.freshWater.dailyLiters, 0)} L/day (
                  {fmt(result.freshWater.dailyM3, 2)} m³/day)
                </ResultValue>
              }
            />
            <ParameterField
              name="FW tank capacity"
              description={
                result.fwAutonomy.source === "endurance"
                  ? `Daily FW × Endurance (${fmt(result.fwAutonomy.days, 1)} days).`
                  : `Daily FW × voyage time (${fmt(result.fwAutonomy.days, 1)} days — Endurance not set).`
              }
              value={
                <ResultValue>
                  {fmt(result.freshWater.tankLiters, 0)} L (
                  {fmt(result.freshWater.tankM3, 2)} m³)
                </ResultValue>
              }
            />
          </ParameterSection>

          {result.wastewater.tanks.map((tank) => (
            <WastewaterTankPanel
              key={tank.id}
              tank={tank}
              personsOnBoard={result.wastewater.personsOnBoard}
              holdingDays={result.sewageHolding.days}
            />
          ))}

          <ParameterSection title="Wastewater — combined total" tone={4}>
            <p className="border-b border-[var(--card-border)] px-0 py-3 text-xs leading-relaxed text-[var(--muted)]">
              Sum of the two separate holding tanks above — not a third tank.
            </p>
            <ParameterField
              name="Wastewater total"
              description="Black-water tank + gray-water tank — daily generation."
              value={
                <ResultValue>
                  {fmt(result.wastewater.totalDailyLiters, 0)} L/day (
                  {fmt(result.wastewater.totalDailyM3, 2)} m³/day)
                </ResultValue>
              }
            />
            <ParameterField
              name="Holding total"
              description="Black-water tank + gray-water tank — holding capacity."
              value={
                <ResultValue>
                  {fmt(result.wastewater.totalHoldingLiters, 0)} L (
                  {fmt(result.wastewater.totalHoldingM3, 2)} m³)
                </ResultValue>
              }
            />
          </ParameterSection>

          <ParameterSection title="Solid waste — stowage" tone={7}>
            <p className="border-b border-[var(--card-border)] px-0 py-3 text-xs leading-relaxed text-[var(--muted)]">
              Reference rates (kg/person/day) × persons on board. Stowage volume = mass ÷ bulk
              density{result.solidWaste.withCompactor ? " (with compactor)" : ""}.
              {result.solidWaste.incinerator
                ? ` Incinerator: ${INCINERATOR_CATEGORY_LABELS} volume × 0.6.`
                : ""}
            </p>
            <ParameterField
              name="Endurance basis"
              description={
                result.solidWaste.period.source === "endurance"
                  ? "From Endurance — solid-waste stowage period."
                  : "From Range ÷ V_s (Endurance not set) — solid-waste stowage period."
              }
              value={
                <ResultValue>
                  {fmtDuration(result.solidWaste.period.days, result.solidWaste.period.hours)}
                </ResultValue>
              }
            />
            {result.solidWaste.categories.map((row) => (
              <div
                key={row.category}
                className="border-b border-[var(--card-border)] py-4 last:border-b-0"
              >
                <ParameterField
                  name={row.label}
                  description={`${fmt(row.rateKgPerPersonDay, 1)} kg/person/day × ${result.solidWaste.personsOnBoard} persons`}
                  value={
                    <ResultValue>
                      {fmt(row.dailyMassKg, 1)} kg/day · {fmt(row.dailyVolumeM3, 1)} m³/day
                    </ResultValue>
                  }
                />
                <ParameterField
                  name={`${row.label} — stowage`}
                  description={`Mass and volume over endurance period (${fmt(result.solidWaste.period.days, 1)} days)`}
                  value={
                    <ResultValue>
                      {fmt(row.voyageMassKg, 1)} kg · {fmt(row.voyageVolumeM3, 1)} m³
                    </ResultValue>
                  }
                />
              </div>
            ))}
          </ParameterSection>

          <ParameterSection title="Total fuel oil — by fuel type" tone={6}>
            {result.rangeFuelByType.map((row) => (
              <div key={row.fuel} className="border-b border-[var(--card-border)] py-4 last:border-b-0">
                <ParameterField
                  name={FUEL_LABELS[row.fuel]}
                  description={`Range voyage consumption — ${fmt(result.voyageHours, 0)} h at V_s.`}
                  value={
                    <ResultValue>
                      {fmt(row.massKg / 1000, 2)} t · {fmt(row.volumeM3, 1)} m³
                    </ResultValue>
                  }
                />
                <ul className="mt-1 space-y-0.5 pl-1 text-xs text-[var(--muted)]">
                  {row.consumers.map((c) => (
                    <li key={c.label}>
                      {c.label}: {fmt(c.massKg / 1000, 2)} t
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </ParameterSection>

          <ParameterSection title={`Fuel service tanks (≥ ${SERVICE_TANK_HOURS} h)`} tone={7}>
            <p className="border-b border-[var(--card-border)] px-0 py-3 text-xs leading-relaxed text-[var(--muted)]">
              One service tank per fuel grade shall hold at least {SERVICE_TANK_HOURS} hours of
              combined consumption from all consumers on that grade at service load.
            </p>
            {result.serviceTanks.map((st) => (
              <div key={st.fuel} className="border-b border-[var(--card-border)] py-4 last:border-b-0">
                <ParameterField
                  name={`${FUEL_LABELS[st.fuel]} — minimum volume`}
                  description={`${SERVICE_TANK_HOURS} h consumption: ${fmt(st.massKg8h / 1000, 2)} t.`}
                  value={<ResultValue>{fmt(st.minVolumeM3, 2)} m³</ResultValue>}
                />
                {st.designVolumeM3 != null && (
                  <ParameterField
                    name="Design service-tank volume"
                    description={
                      st.meetsRequirement
                        ? "Meets the 8-hour minimum."
                        : st.meetsRequirement === false
                          ? "Below the 8-hour minimum — increase capacity."
                          : ""
                    }
                    value={
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          st.meetsRequirement === false
                            ? "text-red-600 dark:text-red-400"
                            : st.meetsRequirement
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-[var(--accent)]"
                        }`}
                      >
                        {fmt(st.designVolumeM3, 2)} m³
                        {st.meetsRequirement === true && " ✓"}
                        {st.meetsRequirement === false && " ✗"}
                      </span>
                    }
                  />
                )}
              </div>
            ))}
          </ParameterSection>
        </div>
        )}
      </CalculatorPhase>
    </ToolLayout>
  );
}
