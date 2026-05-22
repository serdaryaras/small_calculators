"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/ToolLayout";

export default function ExampleCalcPage() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const numA = parseFloat(a);
  const numB = parseFloat(b);
  const valid = !Number.isNaN(numA) && !Number.isNaN(numB);
  const sum = valid ? numA + numB : null;

  return (
    <ToolLayout
      title="Example Calculator"
      description="Sum of two numbers — starter template for new tools."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Value A</span>
          <input
            type="number"
            value={a}
            onChange={(e) => setA(e.target.value)}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            placeholder="0"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Value B</span>
          <input
            type="number"
            value={b}
            onChange={(e) => setB(e.target.value)}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            placeholder="0"
          />
        </label>
      </div>

      <div className="mt-6 rounded-lg bg-[var(--background)] px-4 py-4">
        <p className="text-sm text-[var(--muted)]">Result</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {sum !== null ? sum.toLocaleString("en-US") : "—"}
        </p>
      </div>
    </ToolLayout>
  );
}
