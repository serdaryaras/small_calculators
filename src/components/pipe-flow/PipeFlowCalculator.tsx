"use client";

import { useMemo, useState } from "react";
import { ParameterField, ParameterSection, SectionToneProvider } from "@/components/ParameterField";
import { ToolLayout } from "@/components/ToolLayout";
import {
  fmtDiameter,
  fmtFlow,
  fmtVelocity,
  solvePipeFlow,
  type PipeFlowField,
} from "@/lib/pipe-flow/calculation";
import { PIPE_FLOW_PARAMS as P } from "@/lib/pipe-flow/parameters";

const inputClass =
  "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums outline-none focus:border-[var(--accent)]";

const readOnlyClass =
  "w-full rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/5 px-3 py-2 text-sm font-semibold tabular-nums text-[var(--accent)]";

const SOLVE_OPTIONS: { id: PipeFlowField; label: string }[] = [
  { id: "flowM3H", label: "Q (flow rate)" },
  { id: "diameterMm", label: "d (diameter)" },
  { id: "velocityMs", label: "v (velocity)" },
];

function FlowInput({
  name,
  description,
  value,
  onChange,
  unit,
  readOnly,
  readOnlyDisplay,
}: {
  name: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
  readOnly?: boolean;
  readOnlyDisplay?: string;
}) {
  return (
    <ParameterField
      name={`${name} (${unit})`}
      description={description}
      value={
        readOnly ? (
          <div className={readOnlyClass}>{readOnlyDisplay ?? "—"}</div>
        ) : (
          <input
            type="number"
            className={inputClass}
            value={value}
            min={0}
            step="any"
            placeholder="—"
            onChange={(e) => onChange(e.target.value)}
          />
        )
      }
    />
  );
}

export function PipeFlowCalculator() {
  const [solveFor, setSolveFor] = useState<PipeFlowField>("velocityMs");
  const [flowStr, setFlowStr] = useState("");
  const [diameterStr, setDiameterStr] = useState("");
  const [velocityStr, setVelocityStr] = useState("");

  const result = useMemo(
    () => solvePipeFlow(solveFor, flowStr, diameterStr, velocityStr),
    [solveFor, flowStr, diameterStr, velocityStr],
  );

  const reset = () => {
    setFlowStr("");
    setDiameterStr("");
    setVelocityStr("");
  };

  const solvedDisplay = result.ok
    ? {
        flowM3H: `${fmtFlow(result.flowM3H)} m³/h`,
        diameterMm: `${fmtDiameter(result.diameterMm)} mm`,
        velocityMs: `${fmtVelocity(result.velocityMs)} m/s`,
      }
    : null;

  return (
    <ToolLayout
      title="Pipe Flow (Q = A·V)"
      description="Volumetric flow rate from pipe cross-section and mean velocity."
    >
      <div className="mb-6 rounded-lg border border-[var(--accent)]/30 bg-[var(--background)] px-4 py-3 text-sm">
        <strong>Q = A · v</strong> with{" "}
        <span className="tabular-nums">A = π(d/2000)²</span> m²,{" "}
        <span className="tabular-nums">Q</span> in m³/h,{" "}
        <span className="tabular-nums">d</span> in mm,{" "}
        <span className="tabular-nums">v</span> in m/s →{" "}
        <span className="tabular-nums">Q = π(d/2000)² · v · 3600</span>.
      </div>

      <SectionToneProvider>
        <ParameterSection title="Inputs" tone={0}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Calculate</legend>
              <span className="mr-1 self-center text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Calculate
              </span>
              {SOLVE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${
                    solveFor === opt.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-[var(--accent)]"
                      : "border-[var(--card-border)] hover:border-[var(--accent)]/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="solve-for"
                    className="sr-only"
                    checked={solveFor === opt.id}
                    onChange={() => setSolveFor(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </fieldset>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm font-medium hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Reset
            </button>
          </div>

          <FlowInput
            name={P.flowM3H.name}
            description={P.flowM3H.description}
            unit={P.flowM3H.unit}
            value={flowStr}
            onChange={setFlowStr}
            readOnly={solveFor === "flowM3H"}
            readOnlyDisplay={solvedDisplay?.flowM3H}
          />
          <FlowInput
            name={P.diameterMm.name}
            description={P.diameterMm.description}
            unit={P.diameterMm.unit}
            value={diameterStr}
            onChange={setDiameterStr}
            readOnly={solveFor === "diameterMm"}
            readOnlyDisplay={solvedDisplay?.diameterMm}
          />
          <FlowInput
            name={P.velocityMs.name}
            description={P.velocityMs.description}
            unit={P.velocityMs.unit}
            value={velocityStr}
            onChange={setVelocityStr}
            readOnly={solveFor === "velocityMs"}
            readOnlyDisplay={solvedDisplay?.velocityMs}
          />
        </ParameterSection>
      </SectionToneProvider>

      <div className="mt-6 rounded-lg bg-[var(--background)] px-4 py-4">
        {result.ok ? (
          <>
            <p className="text-sm text-[var(--muted)]">
              Result — all values consistent with Q = A·v
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[var(--muted)]">Q</dt>
                <dd className="text-lg font-semibold tabular-nums text-[var(--accent)]">
                  {fmtFlow(result.flowM3H)} m³/h
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">d</dt>
                <dd className="text-lg font-semibold tabular-nums text-[var(--accent)]">
                  {fmtDiameter(result.diameterMm)} mm
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">v</dt>
                <dd className="text-lg font-semibold tabular-nums text-[var(--accent)]">
                  {fmtVelocity(result.velocityMs)} m/s
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--muted)]">Result</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{result.message}</p>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
