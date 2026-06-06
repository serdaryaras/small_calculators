"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
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
} from "@/lib/tank-capacities/types";
import { calculateTankCapacitiesFromForm } from "@/lib/tank-capacities/validate-and-calculate";
import { voyageHours } from "@/lib/tank-capacities/calculation";

function ResultValue({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-semibold tabular-nums text-[var(--accent)]">{children}</span>
  );
}

function fmt(n: number, digits = 1): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
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
  const resultsRef = useRef<HTMLDivElement>(null);

  const previewHours = voyageHours(rangeNm, vsKn);

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
      mainEngines,
      auxiliaryEngines,
      boilers,
      fuelDensity,
      serviceTankVolume,
    ],
  );

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
      <p className="mb-4 text-sm text-[var(--muted)]">
        Each input follows: <strong>parameter name</strong> · <strong>value</strong> ·{" "}
        <strong>description</strong>. Fresh water and sewage sections will follow.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ParameterSection title="Ship" tone={0}>
            <ParameterTextInput
              name={P.shipName.name}
              description={P.shipName.description}
              value={shipName}
              onChange={setShipName}
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
              min={0.1}
              step={0.5}
            />
            <ParameterNumberInput
              name={P.nonDischargePeriod.name}
              description={P.nonDischargePeriod.description}
              value={nonDischargeDays}
              onChange={setNonDischargeDays}
              min={0.1}
              step={0.5}
            />
            <ParameterField
              name="Voyage duration (preview)"
              description="Range ÷ V_s — used for total fuel-oil quantity at range."
              value={
                <ResultValue>
                  {fmt(previewHours, 0)} h ({fmt(previewHours / 24, 1)} days)
                </ResultValue>
              }
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

      <div className="mt-8">
        <button
          type="button"
          onClick={handleCalculate}
          disabled={calculating}
          className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {calculating ? "Calculating…" : "Calculate tank capacities"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <p className="font-medium">Cannot calculate — fix the following:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {error.split("\n").map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          {warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      {result && (
        <div ref={resultsRef} className="mt-8 space-y-6">
          <ParameterSection title={`Results — ${shipName || "Project"}`} tone={5}>
            <ParameterField
              name="Voyage duration"
              description="Time to cover design range at service speed."
              value={
                <ResultValue>
                  {fmt(result.voyageHours, 0)} h ({fmt(result.voyageDays, 1)} days)
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
    </ToolLayout>
  );
}
