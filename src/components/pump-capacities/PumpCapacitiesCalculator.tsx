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
  BilgeBranchInput,
  BilgeResult,
  FireResult,
  PumpCapacitiesResult,
  ShipType,
} from "@/lib/pump-capacities/types";
import {
  calculatePumpCapacitiesFromForm,
  SHIP_TYPE_OPTIONS,
} from "@/lib/pump-capacities/validate-and-calculate";

function defaultBranch(index: number): BilgeBranchInput {
  return {
    label: `Hold ${index + 1}`,
    lengthM: 20,
    isMachinery: false,
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

function BilgePreview({ bilge }: { bilge: BilgeResult }) {
  const tanker = bilge.shipType === "tanker";
  return (
    <>
      <ParameterField
        name={tanker ? "ER bilge main d" : "Bilge main diameter d"}
        description={bilge.formulaNote}
        value={<ResultValue>{fmt(bilge.dRuleMm)} mm</ResultValue>}
      />
      {bilge.dTwiceMm != null && (
        <ParameterField
          name="d₁√2 check"
          description="Main ≥ branch × √2."
          value={<ResultValue>{fmt(bilge.dTwiceMm)} mm</ResultValue>}
        />
      )}
      <ParameterField
        name="Min actual / recommended DN"
        description="max(d − 5, 60 mm, largest branch)."
        value={
          <ResultValue>
            {fmt(bilge.dMinActualMm)} mm · DN {bilge.recommendedDnMm}
          </ResultValue>
        }
      />
      <ParameterField
        name="Capacity per pump"
        description={
          bilge.reducedQ
            ? "Q = 0.00345 × d² (L < 35 m cargo)."
            : "Q = 0.00565 × d²."
        }
        value={<ResultValue>{fmt(bilge.capacityPerPumpM3H)} m³/h</ResultValue>}
      />
      <ParameterField
        name="Minimum pumps"
        description={bilge.extraNote}
        value={<ResultValue>{bilge.pumpCount}</ResultValue>}
      />
      {bilge.compensationAllowed && (
        <ParameterField
          name="One pump may be ≥ 70%"
          description="Compensation allowed (not passenger)."
          value={<ResultValue>{fmt(bilge.minOnePumpM3H)} m³/h</ResultValue>}
        />
      )}
      {bilge.cargoAreaPumps > 0 && (
        <ParameterField
          name="Cargo-area pumps"
          description="Additional pump(s) — no rule capacity formula."
          value={<ResultValue>{bilge.cargoAreaPumps}</ResultValue>}
        />
      )}
      {bilge.numeralInfo && (
        <ParameterField
          name="Bilge pump numeral"
          description={`K = ${bilge.numeralInfo.K}, P₁ = ${bilge.numeralInfo.P1}`}
          value={<ResultValue>{fmt(bilge.numeralInfo.numeral)}</ResultValue>}
        />
      )}
      {bilge.distributionBoxMm != null && (
        <ParameterField
          name="Distribution box (indicative)"
          description="√(d₁² + d₂²) of two largest branches, ≤ main d."
          value={<ResultValue>{fmt(bilge.distributionBoxMm)} mm</ResultValue>}
        />
      )}
      {bilge.branches
        .filter((b) => b.valid)
        .map((branch, index) => (
          <ParameterField
            key={`${branch.label}-${index}`}
            name={`Branch — ${branch.label}`}
            description={`L₁ = ${branch.lengthM} m${branch.isMachinery ? " · machinery" : ""}`}
            value={<ResultValue>{fmt(branch.d1Mm!)} mm</ResultValue>}
          />
        ))}
      {bilge.machineryBranch?.synthetic && (
        <ParameterField
          name={`Branch — ${bilge.machineryBranch.label}`}
          description={`L₀ = ${bilge.machineryBranch.lengthM} m`}
          value={
            <ResultValue>{fmt(bilge.machineryBranch.d1Mm!)} mm</ResultValue>
          }
        />
      )}
    </>
  );
}

function FirePreview({ fire }: { fire: FireResult }) {
  return (
    <>
      <ParameterField
        name="VT1 / VT2"
        description={`${fire.vt1Label} · ${fire.vt2Label}`}
        value={
          <ResultValue>
            VT1={fire.vt1} · VT2={fire.vt2}
          </ResultValue>
        }
      />
      <ParameterField
        name="Bilge reference (fire)"
        description="Always general bilge d on L, B, D — not tanker ER diameter."
        value={
          <ResultValue>
            {fmt(fire.dBilgeRefMm)} mm · {fmt(fire.qBilgeRefM3H)} m³/h
          </ResultValue>
        }
      />
      <ParameterField
        name="Total fire capacity"
        description={fire.capNote}
        value={<ResultValue>{fmt(fire.totalRequiredM3H)} m³/h</ResultValue>}
      />
      <ParameterField
        name="Main fire pumps"
        description="From VT1."
        value={<ResultValue>{fire.pumpCount}</ResultValue>}
      />
      <ParameterField
        name="Capacity per pump (equal)"
        description={`Total ÷ ${fire.pumpCount}, min 25 m³/h.`}
        value={<ResultValue>{fmt(fire.equalEachM3H)} m³/h</ResultValue>}
      />
      {!fire.firePumpsEqual && (
        <ParameterField
          name="Asymmetric floor (info)"
          description="80% rule — informational only."
          value={
            <span className="text-sm tabular-nums text-[var(--muted)]">
              {fmt(fire.asymmetricEachM3H)} m³/h each
            </span>
          }
        />
      )}
      {fire.monitors > 0 && (
        <ParameterField
          name="Mobile water monitors"
          description="2 if B < 30 m, else 4 — 60 m³/h each."
          value={<ResultValue>{fire.monitors}</ResultValue>}
        />
      )}
      <ParameterField
        name="Hydrant pressure"
        description="Minimum pressure at hydrants."
        value={<ResultValue>{fire.hydrantPressureNMm2} N/mm²</ResultValue>}
      />
      <ParameterField
        name="Emergency fire pump"
        description={
          fire.emergencyRequired
            ? "≥ 40% of total, min 25 m³/h."
            : "Not required for passenger ships under this rule set."
        }
        value={
          <ResultValue>
            {fire.emergencyRequired && fire.emergencyM3H != null
              ? `${fmt(fire.emergencyM3H)} m³/h`
              : "n/a"}
          </ResultValue>
        }
      />
    </>
  );
}

export function PumpCapacitiesCalculator() {
  const [shipName, setShipName] = useState("Newbuilding");
  const [shipType, setShipType] = useState<ShipType>("cargo");
  const [lengthM, setLengthM] = useState(120);
  const [breadthM, setBreadthM] = useState(20);
  const [depthM, setDepthM] = useState(10);
  const [grossTonnage, setGrossTonnage] = useState(5000);
  const [useHoldBreadth, setUseHoldBreadth] = useState(false);
  const [holdBreadthAmidshipsM, setHoldBreadthAmidshipsM] = useState(14);
  const [engineRoomLengthM, setEngineRoomLengthM] = useState(18);
  const [passengerM, setPassengerM] = useState(0);
  const [passengerP, setPassengerP] = useState(0);
  const [passengerV, setPassengerV] = useState(1000);
  const [passengerN, setPassengerN] = useState(0);
  const [passengerPAbove, setPassengerPAbove] = useState(0);
  const [fiveTiers, setFiveTiers] = useState(false);
  const [firePumpsEqual, setFirePumpsEqual] = useState(true);
  const [branches, setBranches] = useState<BilgeBranchInput[]>([]);

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
      useHoldBreadth,
      holdBreadthAmidshipsM,
      engineRoomLengthM,
      passengerM,
      passengerP,
      passengerV,
      passengerN,
      passengerPAbove,
      fiveTiers,
      vt1: null as null,
      vt2: null as null,
      firePumpsEqual,
      branches,
    }),
    [
      shipName,
      shipType,
      lengthM,
      breadthM,
      depthM,
      grossTonnage,
      useHoldBreadth,
      holdBreadthAmidshipsM,
      engineRoomLengthM,
      passengerM,
      passengerP,
      passengerV,
      passengerN,
      passengerPAbove,
      fiveTiers,
      firePumpsEqual,
      branches,
    ],
  );

  const setBranchCount = (count: number) => {
    const next = Math.max(0, Math.min(24, Math.round(count)));
    setBranches((prev) => {
      if (next === prev.length) return prev;
      if (next < prev.length) return prev.slice(0, next);
      return [
        ...prev,
        ...Array.from({ length: next - prev.length }, (_, i) =>
          defaultBranch(prev.length + i),
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
      description="Bilge and fire-fighting pump capacities — BV NR467 method aligned with 11-Pumps."
    >
      <div className="mb-6 rounded-lg border border-[var(--accent)]/30 bg-[var(--background)] px-4 py-3 text-sm">
        <strong>Bureau Veritas NR467</strong> — bilge: Pt C Ch 1 Sec 10 · Pt D Ch 7 (tanker);
        fire: Pt C Ch 4 Sec 6 (VT1/VT2, monitors, hydrant pressure). Same method as the
        desktop 11-Pumps calculator. Indicative design estimate — confirm with class.
      </div>

      <CalculatorPhase
        title="Input"
        description="Ship principal dimensions and options."
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
          {shipType === "tanker" && (
            <ParameterNumberInput
              name={P.engineRoomLength.name}
              description={P.engineRoomLength.description}
              value={engineRoomLengthM}
              onChange={setEngineRoomLengthM}
              min={1}
              step={0.1}
            />
          )}
          {shipType === "cargo" && (
            <>
              <ParameterCheckbox
                name={P.useHoldBreadth.name}
                description={P.useHoldBreadth.description}
                checked={useHoldBreadth}
                onChange={setUseHoldBreadth}
              />
              {useHoldBreadth && (
                <ParameterNumberInput
                  name={P.holdBreadthAmidships.name}
                  description={P.holdBreadthAmidships.description}
                  value={holdBreadthAmidshipsM}
                  onChange={setHoldBreadthAmidshipsM}
                  min={1}
                  step={0.1}
                />
              )}
            </>
          )}
          <ParameterCheckbox
            name={P.fiveTiers.name}
            description={P.fiveTiers.description}
            checked={fiveTiers}
            onChange={setFiveTiers}
          />
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

        {shipType === "passenger" && (
          <ParameterSection title="Passenger bilge numeral" tone={1}>
            <ParameterNumberInput
              name={P.passengerM.name}
              description={P.passengerM.description}
              value={passengerM}
              onChange={setPassengerM}
              min={0}
              step={1}
            />
            <ParameterNumberInput
              name={P.passengerP.name}
              description={P.passengerP.description}
              value={passengerP}
              onChange={setPassengerP}
              min={0}
              step={1}
            />
            <ParameterNumberInput
              name={P.passengerV.name}
              description={P.passengerV.description}
              value={passengerV}
              onChange={setPassengerV}
              min={1}
              step={1}
            />
            <ParameterNumberInput
              name={P.passengerN.name}
              description={P.passengerN.description}
              value={passengerN}
              onChange={setPassengerN}
              min={0}
              step={1}
            />
            <ParameterNumberInput
              name={P.passengerPAbove.name}
              description={P.passengerPAbove.description}
              value={passengerPAbove}
              onChange={setPassengerPAbove}
              min={0}
              step={1}
            />
          </ParameterSection>
        )}

        <ParameterSection title="Bilge branch compartments" tone={2}>
          <ParameterNumberInput
            name={P.bilgeCompartmentCount.name}
            description={P.bilgeCompartmentCount.description}
            value={branches.length}
            onChange={setBranchCount}
            min={0}
            step={1}
          />
          {branches.map((branch, index) => (
            <div key={index} className="border-t border-[var(--card-border)]">
              <p className="py-2 text-xs font-semibold uppercase text-[var(--muted)]">
                Compartment {index + 1}
              </p>
              <ParameterTextInput
                name={`${P.bilgeCompartmentLabel.name} ${index + 1}`}
                description={P.bilgeCompartmentLabel.description}
                value={branch.label}
                onChange={(label) => {
                  const next = [...branches];
                  next[index] = { ...next[index], label };
                  setBranches(next);
                }}
              />
              <ParameterNumberInput
                name={`${P.bilgeCompartmentLength.name} ${index + 1}`}
                description={P.bilgeCompartmentLength.description}
                value={branch.lengthM}
                onChange={(length) => {
                  const next = [...branches];
                  next[index] = { ...next[index], lengthM: length };
                  setBranches(next);
                }}
                min={0.1}
                step={0.1}
              />
              <ParameterCheckbox
                name={`${P.bilgeCompartmentMachinery.name} ${index + 1}`}
                description={P.bilgeCompartmentMachinery.description}
                checked={branch.isMachinery}
                onChange={(isMachinery) => {
                  const next = [...branches];
                  next[index] = { ...next[index], isMachinery };
                  setBranches(next);
                }}
              />
            </div>
          ))}
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
            <ParameterSection
              title={
                previewCalc.bilge.shipType === "tanker"
                  ? "Machinery-space bilge (tanker)"
                  : "Bilge pumps"
              }
              tone={4}
            >
              <BilgePreview bilge={previewCalc.bilge} />
            </ParameterSection>
            <ParameterSection title="Fire pumps" tone={5}>
              <FirePreview fire={previewCalc.fire} />
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
                result.bilge.shipType === "tanker"
                  ? `Machinery-space bilge (tanker) — ${shipName || "Project"}`
                  : `Bilge pumps — ${shipName || "Project"}`
              }
              tone={4}
            >
              <BilgePreview bilge={result.bilge} />
            </ParameterSection>

            <ParameterSection title="Fire pumps" tone={5}>
              <FirePreview fire={result.fire} />
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
