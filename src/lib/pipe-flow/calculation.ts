const SEC_PER_HOUR = 3600;

export type PipeFlowField = "flowM3H" | "diameterMm" | "velocityMs";

export type PipeFlowResult =
  | {
      ok: true;
      solved: PipeFlowField;
      flowM3H: number;
      diameterMm: number;
      velocityMs: number;
    }
  | {
      ok: false;
      reason: "need_two_inputs";
      message: string;
    };

/** Cross-sectional area (m²) from internal diameter (mm). */
export function areaM2(diameterMm: number): number {
  const radiusM = diameterMm / 2000;
  return Math.PI * radiusM * radiusM;
}

/** Q (m³/h) = A (m²) × v (m/s) × 3600 */
export function flowFromDiameterAndVelocity(
  diameterMm: number,
  velocityMs: number,
): number {
  return areaM2(diameterMm) * velocityMs * SEC_PER_HOUR;
}

export function diameterFromFlowAndVelocity(
  flowM3H: number,
  velocityMs: number,
): number {
  const area = flowM3H / (velocityMs * SEC_PER_HOUR);
  return (2 * Math.sqrt(area / Math.PI)) * 1000;
}

export function velocityFromFlowAndDiameter(
  flowM3H: number,
  diameterMm: number,
): number {
  return flowM3H / (areaM2(diameterMm) * SEC_PER_HOUR);
}

function parsePositive(s: string): number | undefined {
  const t = s.trim();
  if (t === "") return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

/** Solve the selected unknown from the other two inputs (strings). */
export function solvePipeFlow(
  solveFor: PipeFlowField,
  flowStr: string,
  diameterStr: string,
  velocityStr: string,
): PipeFlowResult {
  const flowM3H = parsePositive(flowStr);
  const diameterMm = parsePositive(diameterStr);
  const velocityMs = parsePositive(velocityStr);

  const needQ = solveFor !== "flowM3H" && flowM3H == null;
  const needD = solveFor !== "diameterMm" && diameterMm == null;
  const needV = solveFor !== "velocityMs" && velocityMs == null;

  if (needQ || needD || needV) {
    const missing =
      solveFor === "flowM3H"
        ? "diameter and velocity"
        : solveFor === "diameterMm"
          ? "flow rate and velocity"
          : "flow rate and diameter";
    return {
      ok: false,
      reason: "need_two_inputs",
      message: `Enter ${missing} to calculate ${fieldLabel(solveFor)}.`,
    };
  }

  try {
    if (solveFor === "flowM3H") {
      const q = flowFromDiameterAndVelocity(diameterMm!, velocityMs!);
      return {
        ok: true,
        solved: "flowM3H",
        flowM3H: q,
        diameterMm: diameterMm!,
        velocityMs: velocityMs!,
      };
    }
    if (solveFor === "diameterMm") {
      const d = diameterFromFlowAndVelocity(flowM3H!, velocityMs!);
      return {
        ok: true,
        solved: "diameterMm",
        flowM3H: flowM3H!,
        diameterMm: d,
        velocityMs: velocityMs!,
      };
    }
    const v = velocityFromFlowAndDiameter(flowM3H!, diameterMm!);
    return {
      ok: true,
      solved: "velocityMs",
      flowM3H: flowM3H!,
      diameterMm: diameterMm!,
      velocityMs: v,
    };
  } catch {
    return {
      ok: false,
      reason: "need_two_inputs",
      message: "Could not calculate — check the entered values.",
    };
  }
}

function fieldLabel(field: PipeFlowField): string {
  if (field === "flowM3H") return "Q";
  if (field === "diameterMm") return "d";
  return "v";
}

export function fmtFlow(q: number): string {
  return q.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function fmtDiameter(d: number): string {
  return d.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export function fmtVelocity(v: number): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: 3 });
}
