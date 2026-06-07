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
import { complianceBannerClass } from "@/components/eedi/EediReport";
import { ToolLayout } from "@/components/ToolLayout";
import { buildPumpCapacitiesReport } from "@/lib/pump-capacities/build-report";
import { exportPumpCapacitiesReportPdf } from "@/lib/pump-capacities/export-pdf";
import { PUMP_PARAMS as P } from "@/lib/pump-capacities/parameters";
import type { FireRequirements, PumpCapacitiesResult } from "@/lib/pump-capacities/types";
import { calculatePumpCapacitiesFromForm } from "@/lib/pump-capacities/validate-and-calculate";

function ResultValue({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-semibold tabular-nums text-[var(--accent)]">{children}</span>
  );
}

function fmt(n: number, digits = 1): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

const SHIP_TYPE_OPTIONS = [
  { value: "cargo" as const, label: "Cargo ship" },
  { value: "passenger" as const, label: "Passenger ship" },
];

function FirePumpsPreview({
  fire,
  shipType,
  grossTonnage,
}: {
  fire: FireRequirements;
  shipType: "cargo" | "passenger";
  grossTonnage: number;
}) {
  return (
    <>
      {fire.passengerBilgeReferenceM3H != null && (
        <ParameterField
          name="Passenger bilge reference"
          description="4/3 × this value → cargo fire total (SOLAS II-2/10.2.4.1.2)."
          value={
            <ResultValue>{fmt(fire.passengerBilgeReferenceM3H)} m³/h</ResultValue>
          }
        />
      )}
      <ParameterField
        name="Total fire capacity"
        description={
          fire.totalCappedM3H
            ? "Capped at 180 m³/h (cargo ship)."
            : "Rule minimum total main fire pumps."
        }
        value={<ResultValue>{fmt(fire.totalRequiredM3H)} m³/h</ResultValue>}
      />
      <ParameterField
        name="Min main fire pumps"
        description="SOLAS II-2/10.2.2.1."
        value={<ResultValue>{fire.minMainPumpCount}</ResultValue>}
      />
      <ParameterField
        name="Capacity per pump (equal)"
        description={`${fmt(fire.totalRequiredM3H)} ÷ ${fire.minMainPumpCount} — equal split, min 25 m³/h.`}
        value={
          <ResultValue>{fmt(fire.equalSplitCapacityM3H)} m³/h</ResultValue>
        }
      />
      {fire.asymmetricGuidance && (
        <ParameterField
          name="If unequal (optional)"
          description="Smallest at SOLAS floor; others share remaining capacity — informational only."
          value={
            <span className="text-sm tabular-nums text-[var(--muted)]">
              {fire.asymmetricGuidance.line}
            </span>
          }
        />
      )}
      <ParameterField
        name="Emergency fire pump"
        description={
          shipType === "passenger" && grossTonnage >= 1000
            ? "Not required (passenger ≥ 1 000 GT)."
            : fire.emergencyCappedM3H
              ? "Capped at 72 m³/h (container ≥ 5 tiers)."
              : "≥ 40% of total; FSS Ch.12 absolute minimum."
        }
        value={
          <ResultValue>
            {shipType === "passenger" && grossTonnage >= 1000
              ? "n/a"
              : `${fmt(fire.emergencyRequiredM3H)} m³/h`}
          </ResultValue>
        }
      />
    </>
  );
}

export function PumpCapacitiesCalculator() {
  const [shipName, setShipName] = useState("Newbuilding");
  const [shipType, setShipType] = useState<"cargo" | "passenger">("cargo");
  const [lengthM, setLengthM] = useState(120);
  const [breadthM, setBreadthM] = useState(20);
  const [depthM, setDepthM] = useState(10);
  const [grossTonnage, setGrossTonnage] = useState(5000);
  const [shortCargoShip, setShortCargoShip] = useState(false);
  const [containerTiers5Plus, setContainerTiers5Plus] = useState(false);
  const [firePumpsEqual, setFirePumpsEqual] = useState(true);

  const [result, setResult] = useState<PumpCapacitiesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const formState = useMemo(
    () => ({
      shipName,
      shipType,
      lengthM,
      breadthM,
      depthM,
      grossTonnage,
      shortCargoShip,
      containerTiers5Plus,
      firePumpsEqual,
    }),
    [
      shipName,
      shipType,
      lengthM,
      breadthM,
      depthM,
      grossTonnage,
      shortCargoShip,
      containerTiers5Plus,
      firePumpsEqual,
    ],
  );

  const previewCalc = useMemo(() => {
    try {
      return calculatePumpCapacitiesFromForm(formState);
    } catch {
      return null;
    }
  }, [formState]);

  const reportData = useMemo(() => {
    if (!result) return null;
    return buildPumpCapacitiesReport(formState, result, shipName);
  }, [result, formState, shipName]);

  const handleCalculate = () => {
    setError(null);
    setResult(null);
    setCalculating(true);
    try {
      const r = calculatePumpCapacitiesFromForm(formState);
      setResult(r);
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCalculating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportData) return;
    setExportingPdf(true);
    try {
      await exportPumpCapacitiesReportPdf(reportData);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <ToolLayout
      title="Pump Capacities"
      description="Bilge and fire-fighting pump capacities — Bureau Veritas NR467 (Pt C, Ch 1 Sec 10 & Ch 4 Sec 6)."
    >
      <div className="mb-6 rounded-lg border border-[var(--accent)]/30 bg-[var(--background)] px-4 py-3 text-sm">
        <strong>Bureau Veritas NR467</strong> — bilge pumps from Pt C, Ch 1, Sec 10 [6.7–6.8];
        fire pumps from Pt C, Ch 4, Sec 6 (SOLAS II-2/10, FSS Code Ch.12). Indicative design
        estimate — confirm with class.
      </div>

      <p className="mb-2 text-sm text-[var(--muted)]">
        Each field follows: <strong>parameter name</strong> · <strong>value</strong> ·{" "}
        <strong>description</strong>.
      </p>

      <CalculatorPhase
        title="Input"
        description="Ship principal dimensions and fire pump layout."
      >
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
            value={shipType}
            onChange={setShipType}
            options={SHIP_TYPE_OPTIONS}
          />
          <ParameterNumberInput
            name={P.length.name}
            description={P.length.description}
            value={lengthM}
            onChange={setLengthM}
            min={1}
            step={0.1}
          />
          <ParameterNumberInput
            name={P.breadth.name}
            description={P.breadth.description}
            value={breadthM}
            onChange={setBreadthM}
            min={1}
            step={0.1}
          />
          <ParameterNumberInput
            name={P.depth.name}
            description={P.depth.description}
            value={depthM}
            onChange={setDepthM}
            min={1}
            step={0.1}
          />
          <ParameterNumberInput
            name={P.grossTonnage.name}
            description={P.grossTonnage.description}
            value={grossTonnage}
            onChange={setGrossTonnage}
            min={1}
            step={100}
          />
          {shipType === "cargo" && (
            <>
              <ParameterCheckbox
                name={P.shortCargoShip.name}
                description={P.shortCargoShip.description}
                checked={shortCargoShip || lengthM < 35}
                onChange={(v) => {
                  if (lengthM >= 35) setShortCargoShip(v);
                }}
              />
              <ParameterCheckbox
                name={P.containerTiers5Plus.name}
                description={P.containerTiers5Plus.description}
                checked={containerTiers5Plus}
                onChange={setContainerTiers5Plus}
              />
            </>
          )}
          <div className="border-b border-[var(--card-border)] py-4">
            <p className="text-sm font-semibold">{P.firePumpsEqual.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              {P.firePumpsEqual.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="firePumpsEqual"
                  checked={firePumpsEqual}
                  onChange={() => setFirePumpsEqual(true)}
                />
                Yes — equal capacities
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="firePumpsEqual"
                  checked={!firePumpsEqual}
                  onChange={() => setFirePumpsEqual(false)}
                />
                No — asymmetric
              </label>
            </div>
          </div>
        </ParameterSection>
      </CalculatorPhase>

      <CalculatorPhase
        title="Preview"
        description="Live bilge and fire pump rule requirements — updates as you type."
      >
        {!previewCalc ? (
          <p className="text-sm text-[var(--muted)]">
            Enter valid principal dimensions to see pump capacity preview.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <ParameterSection title="Bilge pumps" tone={4}>
              <ParameterField
                name="Bilge main diameter"
                description="d = 25 + 1.68√(L·(B+D)) — BV [6.8.1]."
                value={
                  <ResultValue>{previewCalc.bilge.bilgeMainDiameterMm} mm</ResultValue>
                }
              />
              <ParameterField
                name="Capacity per pump"
                description={previewCalc.bilge.formulaNote}
                value={
                  <ResultValue>{fmt(previewCalc.bilge.capacityPerPumpM3H)} m³/h</ResultValue>
                }
              />
              <ParameterField
                name="Minimum pumps"
                description={`Water velocity ${previewCalc.bilge.waterVelocityMs} m/s — BV [6.7.1].`}
                value={<ResultValue>{previewCalc.bilge.minPumpCount}</ResultValue>}
              />
              <ParameterField
                name="Total bilge capacity"
                description="Sum of minimum required bilge pumps."
                value={
                  <ResultValue>{fmt(previewCalc.bilge.totalRequiredM3H)} m³/h</ResultValue>
                }
              />
            </ParameterSection>

            <ParameterSection title="Fire pumps" tone={5}>
              <FirePumpsPreview
                fire={previewCalc.fire}
                shipType={shipType}
                grossTonnage={grossTonnage}
              />
            </ParameterSection>
          </div>
        )}
      </CalculatorPhase>

      <CalculatorPhase
        title="Results"
        description="Confirmed rule capacities after Calculate."
      >
        <div className="no-print flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCalculate}
            disabled={calculating}
            className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {calculating ? "Calculating…" : "Calculate pump capacities"}
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

        {!result && !error && (
          <p className="text-sm text-[var(--muted)]">
            Press <strong>Calculate pump capacities</strong> to generate results.
          </p>
        )}

        {result && (
          <div ref={resultsRef} className="space-y-6">
            <div
              className={`rounded-lg border px-4 py-3 text-center text-base font-bold ${complianceBannerClass(reportData?.overallPass ?? null)}`}
            >
              {reportData?.overallLabel}
            </div>

            <ParameterSection title={`Bilge pumps — ${shipName || "Project"}`} tone={4}>
              <ParameterField
                name="Bilge main d"
                description="Internal diameter of bilge main (mm)."
                value={<ResultValue>{result.bilge.bilgeMainDiameterMm} mm</ResultValue>}
              />
              <ParameterField
                name="Rule capacity each"
                description={result.bilge.formulaNote}
                value={
                  <ResultValue>{fmt(result.bilge.capacityPerPumpM3H)} m³/h</ResultValue>
                }
              />
              <ParameterField
                name="Minimum pump count"
                description={result.bilge.ruleRef}
                value={<ResultValue>{result.bilge.minPumpCount}</ResultValue>}
              />
            </ParameterSection>

            <ParameterSection title="Fire pumps" tone={5}>
              <FirePumpsPreview
                fire={result.fire}
                shipType={shipType}
                grossTonnage={grossTonnage}
              />
            </ParameterSection>

            {result.notes.map((n, i) => (
              <p key={i} className="text-xs text-[var(--muted)]">
                {n}
              </p>
            ))}
          </div>
        )}
      </CalculatorPhase>
    </ToolLayout>
  );
}
