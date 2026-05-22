"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ParameterCheckbox,
  ParameterField,
  ParameterNumberInput,
  ParameterSection,
  ParameterSelect,
  ParameterTextInput,
} from "@/components/ParameterField";
import { ToolLayout } from "@/components/ToolLayout";
import type { EediBreakdown, MainEngineSpec } from "@/lib/eedi/calculation";
import { suggestedCorrectionFactors } from "@/lib/eedi/correction-factors";
import { buildEediReport } from "@/lib/eedi/build-report";
import { exportEediReportPdf } from "@/lib/eedi/export-pdf";
import {
  calculateEediFromForm,
  suggestedCapacityMode,
} from "@/lib/eedi/validate-and-calculate";
import { ComplianceRow } from "@/components/eedi/ComplianceRows";
import { complianceBannerClass } from "@/components/eedi/EediReport";
import { CF_BY_FUEL, FUEL_LABELS, FUEL_TYPES, type FuelType } from "@/lib/eedi/constants";
import {
  CAPACITY_MODE_OPTIONS,
  EEDI_PARAMS as P,
} from "@/lib/eedi/parameters";
import {
  CATEGORY_LABELS,
  SHIP_CATEGORIES,
  type ShipCategory,
} from "@/lib/eedi/marpol-reg24";
import type { ComplianceResult } from "@/lib/eedi/marpol-reg24";

type CapMode = "dwt" | "dwt_containership_70" | "gt";

function ResultValue({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-semibold tabular-nums text-[var(--accent)]">{children}</span>
  );
}

export function EediCalculator() {
  const [shipName, setShipName] = useState("Newbuilding");
  const [vRef, setVRef] = useState(14);
  const [capMode, setCapMode] = useState<CapMode>("dwt");
  const [dwtInput, setDwtInput] = useState(50_000);
  const [gtInput, setGtInput] = useState(25_000);

  const [regCategory, setRegCategory] = useState<ShipCategory>("bulk_carrier");
  const [regGt, setRegGt] = useState(0);

  const [autoCf, setAutoCf] = useState(true);
  const [shuttleRedundancy, setShuttleRedundancy] = useState(false);

  const [fi, setFi] = useState(1);
  const [fc, setFc] = useState(1);
  const [fl, setFl] = useState(1);
  const [fw, setFw] = useState(1);
  const [fjProd, setFjProd] = useState(1);
  const [feff, setFeff] = useState(1);
  const [cfNotes, setCfNotes] = useState<string[]>([]);

  const [nMe, setNMe] = useState(1);
  const [mainEngines, setMainEngines] = useState<MainEngineSpec[]>([
    { mcrKw: 12_000, sfcGPerKwh: 185, fuel: "heavy_fuel_oil" },
  ]);
  const [sfcAe, setSfcAe] = useState(210);
  const [fuelAe, setFuelAe] = useState<FuelType>("diesel_gas_oil");
  const [pAeOverride, setPAeOverride] = useState("");
  const [nPto, setNPto] = useState(0);
  const [ptoKw, setPtoKw] = useState<number[]>([]);
  const [nPti, setNPti] = useState(0);
  const [ptiKw, setPtiKw] = useState<number[]>([]);
  const [peff, setPeff] = useState(0);
  const [paeEff, setPaeEff] = useState(0);

  const [result, setResult] = useState<EediBreakdown | null>(null);
  const [compliance, setCompliance] = useState<ComplianceResult | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const capacityT =
    capMode === "dwt"
      ? dwtInput
      : capMode === "dwt_containership_70"
        ? 0.7 * dwtInput
        : gtInput;

  const applyAutoCf = () => {
    const { factors, notes } = suggestedCorrectionFactors({
      category: regCategory,
      dwt: dwtInput,
      vRefKn: vRef,
      shuttleTankerRedundancy: shuttleRedundancy,
    });
    setFi(factors.fi);
    setFc(factors.fc);
    setFl(factors.fl);
    setFw(factors.fw);
    setFjProd(factors.fj);
    setFeff(factors.feff);
    setCfNotes(notes);
  };

  useEffect(() => {
    if (autoCf) applyAutoCf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCf, regCategory, dwtInput, vRef, shuttleRedundancy]);

  useEffect(() => {
    setCapMode(suggestedCapacityMode(regCategory));
  }, [regCategory]);

  useEffect(() => {
    if (capMode === "gt" && gtInput > 0) {
      if (
        regCategory === "cruise_passenger_non_conventional" ||
        regCategory === "roro_vehicle"
      ) {
        setRegGt(gtInput);
      }
    }
  }, [capMode, gtInput, regCategory]);

  const syncMeCount = (n: number) => {
    setNMe(n);
    setMainEngines((prev) => {
      const next = [...prev];
      while (next.length < n) {
        next.push({ mcrKw: 12_000, sfcGPerKwh: 185, fuel: "heavy_fuel_oil" });
      }
      return next.slice(0, n);
    });
  };

  const syncPtoCount = (n: number) => {
    setNPto(n);
    setPtoKw((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(1500);
      return next.slice(0, n);
    });
  };

  const syncPtiCount = (n: number) => {
    setNPti(n);
    setPtiKw((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(0);
      return next.slice(0, n);
    });
  };

  const formState = useMemo(
    () => ({
      shipName,
      vRef,
      capMode,
      dwtInput,
      gtInput,
      capacityT,
      regCategory,
      regGt,
      autoCf,
      shuttleRedundancy,
      fi,
      fc,
      fl,
      fw,
      fjProd,
      feff,
      nMe,
      mainEngines,
      sfcAe,
      fuelAe,
      pAeOverride,
      nPto,
      ptoKw,
      nPti,
      ptiKw,
      peff,
      paeEff,
    }),
    [
      shipName,
      vRef,
      capMode,
      dwtInput,
      gtInput,
      capacityT,
      regCategory,
      regGt,
      autoCf,
      shuttleRedundancy,
      fi,
      fc,
      fl,
      fw,
      fjProd,
      feff,
      nMe,
      mainEngines,
      sfcAe,
      fuelAe,
      pAeOverride,
      nPto,
      ptoKw,
      nPti,
      ptiKw,
      peff,
      paeEff,
    ],
  );

  const reportData = useMemo(() => {
    if (!result || !compliance) return null;
    return buildEediReport(formState, result, compliance, shipName);
  }, [result, compliance, formState, shipName]);

  const handleCalculate = () => {
    setError(null);
    setResult(null);
    setCompliance(null);
    setWarnings([]);
    setCalculating(true);

    try {
      const { attained, compliance: comp, warnings: w } =
        calculateEediFromForm(formState);
      setResult(attained);
      setCompliance(comp);
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

  const handleDownloadPdf = async () => {
    if (!reportData) return;
    setExportingPdf(true);
    try {
      await exportEediReportPdf(reportData);
    } finally {
      setExportingPdf(false);
    }
  };

  const fuelOptions = FUEL_TYPES.map((f) => ({
    value: f,
    label: `${FUEL_LABELS[f]} (CF ${CF_BY_FUEL[f]})`,
  }));

  return (
    <ToolLayout
      title="EEDI Calculator"
      description="Attained EEDI per IMO MEPC.308(73) — conventional motor ships."
    >
      <div className="mb-6 rounded-lg border border-[var(--accent)]/30 bg-[var(--background)] px-4 py-3 text-sm">
        <strong>Phase 3 only</strong> — for ships subject to the reduction factor applicable from{" "}
        <strong>1 January 2025</strong>. Required EEDI uses the Phase 3 (Jan 2025) column
        automatically.
      </div>

      <p className="mb-4 text-sm text-[var(--muted)]">
        Each input follows: <strong>parameter name</strong> · <strong>value</strong> ·{" "}
        <strong>description</strong>.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ParameterSection title="General">
            <ParameterTextInput
              name={P.shipName.name}
              description={P.shipName.description}
              value={shipName}
              onChange={setShipName}
            />
            <ParameterNumberInput
              name={P.vRef.name}
              description={P.vRef.description}
              value={vRef}
              onChange={setVRef}
              min={0.1}
              step={0.1}
            />
            <div className="border-b border-[var(--card-border)] py-4">
              <p className="text-sm font-semibold">{P.capacityMode.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                {P.capacityMode.description}
              </p>
              <div className="mt-4 space-y-4">
                {CAPACITY_MODE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`block cursor-pointer rounded-lg border p-3 transition ${
                      capMode === opt.value
                        ? "border-[var(--accent)] bg-[var(--background)]"
                        : "border-[var(--card-border)] hover:border-[var(--accent)]/50"
                    }`}
                  >
                    <span className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="capMode"
                        className="mt-1"
                        checked={capMode === opt.value}
                        onChange={() => setCapMode(opt.value)}
                      />
                      <span className="flex-1">
                        <span className="text-sm font-medium">{opt.label}</span>
                        <span className="mt-1.5 block text-xs leading-relaxed text-[var(--muted)]">
                          {opt.whenToUse}
                        </span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <ParameterNumberInput
            name={P.dwt.name}
            description={P.dwt.description}
            value={dwtInput}
            onChange={setDwtInput}
            min={1}
            step={100}
          />
          {capMode === "gt" && (
            <ParameterNumberInput
              name={P.gt.name}
              description={P.gt.description}
              value={gtInput}
              onChange={setGtInput}
              min={1}
              step={500}
            />
          )}
            {capMode === "dwt_containership_70" && (
              <ParameterField
                name="Capacity (computed)"
                description="70% × DWT used in attained EEDI denominator."
                value={
                  <ResultValue>{capacityT.toLocaleString("en-US")} t</ResultValue>
                }
              />
            )}
          </ParameterSection>

          <ParameterSection title="Reg. 24 — Required EEDI">
            <ParameterSelect
              name={P.shipCategory.name}
              description={P.shipCategory.description}
              value={regCategory}
              onChange={setRegCategory}
              options={SHIP_CATEGORIES.map((c) => ({
                value: c,
                label: CATEGORY_LABELS[c],
              }))}
            />
            <ParameterNumberInput
              name={P.regGt.name}
              description={P.regGt.description}
              value={regGt}
              onChange={setRegGt}
              min={0}
              step={500}
            />
          </ParameterSection>

          <ParameterSection title="Correction factors">
            <ParameterCheckbox
              name={P.autoCorrectionFactors.name}
              description={P.autoCorrectionFactors.description}
              checked={autoCf}
              onChange={setAutoCf}
            />
            <ParameterCheckbox
              name={P.shuttleRedundancy.name}
              description={P.shuttleRedundancy.description}
              checked={shuttleRedundancy}
              onChange={setShuttleRedundancy}
            />
            <ParameterNumberInput
              name={P.fi.name}
              description={P.fi.description}
              value={fi}
              onChange={setFi}
              min={0.001}
              step={0.01}
            />
            <ParameterNumberInput
              name={P.fc.name}
              description={P.fc.description}
              value={fc}
              onChange={setFc}
              min={0.001}
              step={0.01}
            />
            <ParameterNumberInput
              name={P.fl.name}
              description={P.fl.description}
              value={fl}
              onChange={setFl}
              min={0.001}
              step={0.01}
            />
            <ParameterNumberInput
              name={P.fw.name}
              description={P.fw.description}
              value={fw}
              onChange={setFw}
              min={0.001}
              step={0.01}
            />
            <ParameterNumberInput
              name={P.fjProduct.name}
              description={P.fjProduct.description}
              value={fjProd}
              onChange={setFjProd}
              min={0.001}
              step={0.01}
            />
            <ParameterNumberInput
              name={P.feffProduct.name}
              description={P.feffProduct.description}
              value={feff}
              onChange={setFeff}
              min={0}
              step={0.01}
            />
            {cfNotes.map((n, i) => (
              <p key={i} className="py-2 text-xs text-[var(--muted)]">
                {n}
              </p>
            ))}
          </ParameterSection>
        </div>

        <div className="space-y-6">
          <ParameterSection title="Propulsion">
            <ParameterNumberInput
              name={P.nMainEngines.name}
              description={P.nMainEngines.description}
              value={nMe}
              onChange={(v) => syncMeCount(Math.min(6, Math.max(1, Math.round(v))))}
              min={1}
              step={1}
            />
            {mainEngines.map((me, i) => (
              <div key={i} className="border-t border-[var(--card-border)]">
                <p className="py-2 text-xs font-semibold uppercase text-[var(--muted)]">
                  Main engine {i + 1}
                </p>
                <ParameterNumberInput
                  name={`${P.mcr.name} (ME ${i + 1})`}
                  description={P.mcr.description}
                  value={me.mcrKw}
                  onChange={(v) => {
                    const next = [...mainEngines];
                    next[i] = { ...next[i], mcrKw: v };
                    setMainEngines(next);
                  }}
                  min={1}
                />
                <ParameterNumberInput
                  name={`${P.sfcMe.name} (ME ${i + 1})`}
                  description={P.sfcMe.description}
                  value={me.sfcGPerKwh}
                  onChange={(v) => {
                    const next = [...mainEngines];
                    next[i] = { ...next[i], sfcGPerKwh: v };
                    setMainEngines(next);
                  }}
                  min={0.1}
                  step={0.1}
                />
                <ParameterSelect
                  name={`${P.fuelMe.name} (ME ${i + 1})`}
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

            <ParameterNumberInput
              name={P.sfcAe.name}
              description={P.sfcAe.description}
              value={sfcAe}
              onChange={setSfcAe}
              min={0.1}
              step={0.1}
            />
            <ParameterSelect
              name={P.fuelAe.name}
              description={P.fuelAe.description}
              value={fuelAe}
              onChange={setFuelAe}
              options={fuelOptions}
            />
            <ParameterTextInput
              name={P.pAe.name}
              description={P.pAe.description}
              value={pAeOverride}
              onChange={setPAeOverride}
              placeholder="auto"
            />
            <ParameterNumberInput
              name={P.nPto.name}
              description={P.nPto.description}
              value={nPto}
              onChange={(v) => syncPtoCount(Math.min(4, Math.max(0, Math.round(v))))}
              min={0}
              step={1}
            />
            {ptoKw.map((kw, i) => (
              <ParameterNumberInput
                key={i}
                name={`${P.ptoRated.name} ${i + 1}`}
                description={P.ptoRated.description}
                value={kw}
                onChange={(v) => {
                  const next = [...ptoKw];
                  next[i] = v;
                  setPtoKw(next);
                }}
              />
            ))}
            <ParameterNumberInput
              name={P.nPti.name}
              description={P.nPti.description}
              value={nPti}
              onChange={(v) => syncPtiCount(Math.min(4, Math.max(0, Math.round(v))))}
              min={0}
              step={1}
            />
            {ptiKw.map((kw, i) => (
              <ParameterNumberInput
                key={i}
                name={`${P.pPti.name} ${i + 1}`}
                description={P.pPti.description}
                value={kw}
                onChange={(v) => {
                  const next = [...ptiKw];
                  next[i] = v;
                  setPtiKw(next);
                }}
              />
            ))}
            <ParameterNumberInput
              name={P.pEff.name}
              description={P.pEff.description}
              value={peff}
              onChange={setPeff}
            />
            <ParameterNumberInput
              name={P.pAeEff.name}
              description={P.pAeEff.description}
              value={paeEff}
              onChange={setPaeEff}
            />
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
          {calculating ? "Calculating…" : "Calculate EEDI"}
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

      {result && compliance && (
        <div ref={resultsRef} className="mt-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className={`flex-1 rounded-lg border px-4 py-3 text-center text-base font-bold ${complianceBannerClass(compliance.complies)}`}
            >
              {compliance.complies === true
                ? "PASS — Attained EEDI meets Phase 3 required limit"
                : compliance.complies === false
                  ? "FAIL — Attained EEDI exceeds Phase 3 required limit"
                  : "Required EEDI — not applicable for this size / phase"}
            </div>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!reportData || exportingPdf}
              className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {exportingPdf ? "PDF…" : "Download PDF"}
            </button>
          </div>

          <ParameterSection title={`Results — ${shipName || "Project"}`}>
            <ParameterField
              name="Attained EEDI"
              description="Energy Efficiency Design Index from §2.1 (g CO₂ per tonne-nautical mile)."
              value={<ResultValue>{result.attainedEedi.toFixed(3)} gCO₂/t·nm</ResultValue>}
            />
            <ParameterField
              name="P_AE (used)"
              description="Auxiliary power applied in the calculation (kW)."
              value={
                <ResultValue>
                  {result.pAeKw.toLocaleString("en-US", { maximumFractionDigits: 1 })} kW
                </ResultValue>
              }
            />
            <ParameterField
              name="Denominator"
              description="f_i × f_c × f_l × Capacity × V_ref × f_w (t·nm/h)."
              value={<ResultValue>{result.denominatorTNmPerH.toExponential(3)}</ResultValue>}
            />
            <ParameterField
              name="Σ P_ME @ 75% MCR"
              description="Sum of main-engine powers at 75% MCR (kW)."
              value={
                <ResultValue>
                  {result.pMeItemsKw.reduce((a, b) => a + b, 0).toFixed(1)} kW
                </ResultValue>
              }
            />
            <ParameterField
              name="Numerator"
              description="CO₂ emission rate × Πf_j × Πf_eff (g CO₂/h)."
              value={
                <ResultValue>{result.numeratorGco2PerH.toExponential(4)}</ResultValue>
              }
            />
          </ParameterSection>

          {result.notes.map((n, i) => (
            <p key={i} className="text-sm text-amber-700 dark:text-amber-300">
              {n}
            </p>
          ))}

          <section className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
            <h3 className="border-b border-[var(--card-border)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Required EEDI (Phase 3 — from 1 Jan 2025)
            </h3>
            {compliance.referenceLineEedi != null && (
              <ComplianceRow
                name="Reference line EEDI"
                description="Regulation 24 Table 2 reference line value (gCO₂/t·nm)."
                value={`${compliance.referenceLineEedi.toFixed(3)} gCO₂/t·nm`}
              />
            )}
            {compliance.reductionPercent != null && (
              <ComplianceRow
                name="Reduction factor X"
                description="Phase 3 (Jan 2025) reduction percentage from MEPC.328 Table 1."
                value={`${compliance.reductionPercent.toFixed(2)} %`}
              />
            )}
            {compliance.requiredEedi != null ? (
              <>
                <ComplianceRow
                  name="Required EEDI"
                  description="(1 − X/100) × reference line — maximum permitted attained value."
                  value={`${compliance.requiredEedi.toFixed(3)} gCO₂/t·nm`}
                />
                <ComplianceRow
                  name="Attained EEDI"
                  description="Calculated attained value to compare with required."
                  value={`${result.attainedEedi.toFixed(3)} gCO₂/t·nm`}
                />
                <ComplianceRow
                  name="Attained vs required"
                  description="Attained must not exceed required."
                  value={`${result.attainedEedi.toFixed(3)} vs ${compliance.requiredEedi.toFixed(3)} gCO₂/t·nm`}
                  status={compliance.complies ? "pass" : "fail"}
                />
                <ComplianceRow
                  name="Margin"
                  description="Required − attained (positive = below limit)."
                  value={`${(compliance.margin ?? 0) >= 0 ? "+" : ""}${(compliance.margin ?? 0).toFixed(3)} gCO₂/t·nm`}
                  status={compliance.complies ? "pass" : "fail"}
                />
                <ComplianceRow
                  name="Compliance criterion"
                  description={
                    compliance.complies
                      ? "Attained EEDI is not greater than required EEDI"
                      : "Attained EEDI exceeds required EEDI"
                  }
                  value={compliance.complies ? "PASS" : "FAIL"}
                  status={compliance.complies ? "pass" : "fail"}
                />
              </>
            ) : (
              <ComplianceRow
                name="Required EEDI"
                description="No mandatory required EEDI for this size band in Phase 3."
                value="n/a"
              />
            )}
            {compliance.messages.map((m, i) => (
              <p key={i} className="border-t border-[var(--card-border)] px-4 py-2 text-xs text-[var(--muted)]">
                {m}
              </p>
            ))}
          </section>
        </div>
      )}
    </ToolLayout>
  );
}
