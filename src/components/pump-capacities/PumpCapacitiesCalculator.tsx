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
import type {
  BilgeCompartmentInput,
  BilgeExtendedRequirements,
  BilgeRequirements,
  FireRequirements,
  PumpCapacitiesResult,
} from "@/lib/pump-capacities/types";
import {
  BILGE_COMPARTMENT_KIND_OPTIONS,
  calculatePumpCapacitiesFromForm,
} from "@/lib/pump-capacities/validate-and-calculate";

function defaultBilgeCompartment(index: number): BilgeCompartmentInput {
  return {
    label: `Hold ${index + 1}`,
    lengthM: 20,
    kind: "cargo_hold",
  };
}

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

function BilgePumpsPreview({ bilge }: { bilge: BilgeRequirements }) {
  const tanker = bilge.bilgeMode === "tanker_machinery";
  return (
    <>
      <ParameterField
        name={tanker ? "ER bilge main d" : "Bilge main diameter"}
        description={
          tanker
            ? "d = 25 + 2.16√(C·(B+D)) — Pt C [6.8.9]; ship formula [6.8.1] does not apply."
            : "d = 25 + 1.68√(L·(B+D)) — BV [6.8.1]."
        }
        value={<ResultValue>{bilge.bilgeMainDiameterMm} mm</ResultValue>}
      />
      <ParameterField
        name="Capacity per pump"
        description={bilge.formulaNote}
        value={<ResultValue>{fmt(bilge.capacityPerPumpM3H)} m³/h</ResultValue>}
      />
      <ParameterField
        name="Minimum pumps"
        description={`Water velocity ${bilge.waterVelocityMs} m/s — BV [6.7.1].`}
        value={<ResultValue>{bilge.minPumpCount}</ResultValue>}
      />
      <ParameterField
        name="Total bilge capacity"
        description="Sum of minimum required bilge pumps."
        value={<ResultValue>{fmt(bilge.totalRequiredM3H)} m³/h</ResultValue>}
      />
    </>
  );
}

function BilgeExtendedPreview({
  extended,
  bilgeMode,
}: {
  extended: BilgeExtendedRequirements;
  bilgeMode: BilgeRequirements["bilgeMode"];
}) {
  return (
    <>
      {extended.doubleHullCargo && bilgeMode !== "tanker_machinery" && (
        <>
          <ParameterField
            name="Double-hull bilge main (B_hold)"
            description={extended.doubleHullCargo.notes[0]}
            value={
              <ResultValue>
                {extended.doubleHullCargo.bilgeMainDiameterMm} mm
              </ResultValue>
            }
          />
          <ParameterField
            name="Reference bilge main (full B)"
            description={`Standard formula with ship breadth B — ${extended.doubleHullCargo.standardBilgeMainDiameterMm} mm.`}
            value={
              <span className="text-sm tabular-nums text-[var(--muted)]">
                {extended.doubleHullCargo.standardBilgeMainDiameterMm} mm
              </span>
            }
          />
        </>
      )}
      {extended.tankerMachinery && bilgeMode === "tanker_machinery" && (
        <ParameterField
          name="ER branch suction d₁"
          description={extended.tankerMachinery.notes[1]}
          value={
            <ResultValue>{extended.tankerMachinery.branchDiameterMm} mm</ResultValue>
          }
        />
      )}
      {extended.branches.map((branch, index) => (
        <ParameterField
          key={`${branch.label}-${index}`}
          name={`Branch — ${branch.label}`}
          description={branch.formulaNote}
          value={<ResultValue>{branch.diameterMm} mm</ResultValue>}
        />
      ))}
    </>
  );
}

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
      {fire.tankerFireBasisNote && (
        <ParameterField
          name="Tanker — fire capacity basis"
          description={fire.tankerFireBasisNote}
          value={
            <span className="text-sm text-[var(--muted)]">
              Passenger bilge reference (not ER bilge)
            </span>
          }
        />
      )}
      {fire.passengerBilgeReferenceM3H != null && (
        <ParameterField
          name="Cargo rule — bilge reference (passenger formula)"
          description={
            fire.tankerFireBasisNote
              ? "Q_passenger = 0.00565 × d² with d from [6.8.1] on same L, B, D — tanker fire total = 4/3 × this (II-2/10.2.4.1.2)."
              : "SOLAS cargo fire total uses one passenger-ship bilge pump on the same L, B, D: 4/3 × this value (II-2/10.2.4.1.2)."
          }
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
  const [isTanker, setIsTanker] = useState(false);
  const [machinerySpaceLengthM, setMachinerySpaceLengthM] = useState(18);
  const [doubleHullCargoHolds, setDoubleHullCargoHolds] = useState(false);
  const [holdBreadthAmidshipsM, setHoldBreadthAmidshipsM] = useState(14);
  const [bilgeCompartments, setBilgeCompartments] = useState<BilgeCompartmentInput[]>(
    [],
  );

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
      isTanker,
      machinerySpaceLengthM,
      doubleHullCargoHolds,
      holdBreadthAmidshipsM,
      bilgeCompartments,
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
      isTanker,
      machinerySpaceLengthM,
      doubleHullCargoHolds,
      holdBreadthAmidshipsM,
      bilgeCompartments,
    ],
  );

  const setBilgeCompartmentCount = (count: number) => {
    const next = Math.max(0, Math.min(24, Math.round(count)));
    setBilgeCompartments((prev) => {
      if (next === prev.length) return prev;
      if (next < prev.length) return prev.slice(0, next);
      return [
        ...prev,
        ...Array.from({ length: next - prev.length }, (_, i) =>
          defaultBilgeCompartment(prev.length + i),
        ),
      ];
    });
  };

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
        <strong>Bureau Veritas NR467</strong> — bilge pumps and pipe sizing from Pt C, Ch 1, Sec 10
        [6.7–6.8] (main, branch, tanker ER, double-hull holds); fire pumps from Pt C, Ch 4, Sec 6
        (SOLAS II-2/10, FSS Code Ch.12). Indicative design estimate — confirm with class.
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

        {shipType === "cargo" && (
          <ParameterSection title="Bilge details" tone={1}>
            <ParameterCheckbox
              name={P.isTanker.name}
              description={P.isTanker.description}
              checked={isTanker}
              onChange={setIsTanker}
            />
            {isTanker && (
              <ParameterNumberInput
                name={P.machinerySpaceLength.name}
                description={P.machinerySpaceLength.description}
                value={machinerySpaceLengthM}
                onChange={setMachinerySpaceLengthM}
                min={1}
                step={0.1}
              />
            )}
            <ParameterCheckbox
              name={P.doubleHullCargoHolds.name}
              description={P.doubleHullCargoHolds.description}
              checked={doubleHullCargoHolds}
              onChange={setDoubleHullCargoHolds}
            />
            {doubleHullCargoHolds && (
              <ParameterNumberInput
                name={P.holdBreadthAmidships.name}
                description={P.holdBreadthAmidships.description}
                value={holdBreadthAmidshipsM}
                onChange={setHoldBreadthAmidshipsM}
                min={1}
                step={0.1}
              />
            )}
            <ParameterNumberInput
              name={P.bilgeCompartmentCount.name}
              description={P.bilgeCompartmentCount.description}
              value={bilgeCompartments.length}
              onChange={setBilgeCompartmentCount}
              min={0}
              step={1}
            />
            {bilgeCompartments.map((compartment, index) => (
              <div key={index} className="border-t border-[var(--card-border)]">
                <p className="py-2 text-xs font-semibold uppercase text-[var(--muted)]">
                  Compartment {index + 1}
                </p>
                <ParameterTextInput
                  name={`${P.bilgeCompartmentLabel.name} ${index + 1}`}
                  description={P.bilgeCompartmentLabel.description}
                  value={compartment.label}
                  onChange={(label) => {
                    const next = [...bilgeCompartments];
                    next[index] = { ...next[index], label };
                    setBilgeCompartments(next);
                  }}
                />
                <ParameterNumberInput
                  name={`${P.bilgeCompartmentLength.name} ${index + 1}`}
                  description={P.bilgeCompartmentLength.description}
                  value={compartment.lengthM}
                  onChange={(lengthM) => {
                    const next = [...bilgeCompartments];
                    next[index] = { ...next[index], lengthM };
                    setBilgeCompartments(next);
                  }}
                  min={0.1}
                  step={0.1}
                />
                <ParameterSelect
                  name={`${P.bilgeCompartmentKind.name} ${index + 1}`}
                  description={P.bilgeCompartmentKind.description}
                  value={compartment.kind}
                  onChange={(kind) => {
                    const next = [...bilgeCompartments];
                    next[index] = { ...next[index], kind };
                    setBilgeCompartments(next);
                  }}
                  options={BILGE_COMPARTMENT_KIND_OPTIONS}
                />
              </div>
            ))}
          </ParameterSection>
        )}
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
            <ParameterSection
              title={
                previewCalc.bilge.bilgeMode === "tanker_machinery"
                  ? "Machinery-space bilge (tanker)"
                  : "Bilge pumps"
              }
              tone={4}
            >
              <BilgePumpsPreview bilge={previewCalc.bilge} />
              <BilgeExtendedPreview
                extended={previewCalc.bilgeExtended}
                bilgeMode={previewCalc.bilge.bilgeMode}
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

            <ParameterSection
              title={
                result.bilge.bilgeMode === "tanker_machinery"
                  ? `Machinery-space bilge (tanker) — ${shipName || "Project"}`
                  : `Bilge pumps — ${shipName || "Project"}`
              }
              tone={4}
            >
              <BilgePumpsPreview bilge={result.bilge} />
              <BilgeExtendedPreview
                extended={result.bilgeExtended}
                bilgeMode={result.bilge.bilgeMode}
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
