"use client";

import { useMemo } from "react";
import {
  formatParameterBlock,
  type ParameterRecord,
} from "@/lib/parameters";

type Props = {
  parameters: ParameterRecord[];
  title?: string;
};

export function ParameterReadout({ parameters, title = "Parameter readout" }: Props) {
  const textBlock = useMemo(
    () => formatParameterBlock(parameters),
    [parameters],
  );

  const json = useMemo(() => JSON.stringify(parameters, null, 2), [parameters]);

  const copyText = async () => {
    await navigator.clipboard.writeText(textBlock);
  };

  const copyJson = async () => {
    await navigator.clipboard.writeText(json);
  };

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyText}
            className="rounded border border-[var(--card-border)] px-2 py-1 text-xs hover:border-[var(--accent)]"
          >
            Copy lines
          </button>
          <button
            type="button"
            onClick={copyJson}
            className="rounded border border-[var(--card-border)] px-2 py-1 text-xs hover:border-[var(--accent)]"
          >
            Copy JSON
          </button>
        </div>
      </div>

      <p className="border-b border-[var(--card-border)] px-4 py-2 text-xs text-[var(--muted)]">
        Format: <code>name, value, description</code> — {parameters.length} parameters read
      </p>

      <div className="max-h-80 overflow-auto px-4 py-3">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase text-[var(--muted)]">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Value</th>
              <th className="pb-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((p, i) => (
              <tr
                key={`${p.name}-${i}`}
                className="border-t border-[var(--card-border)]/60"
              >
                <td className="py-2 pr-4 align-top font-medium">{p.name}</td>
                <td className="py-2 pr-4 align-top tabular-nums text-[var(--accent)]">
                  {String(p.value)}
                </td>
                <td className="py-2 align-top text-xs text-[var(--muted)]">
                  {p.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="border-t border-[var(--card-border)] px-4 py-2">
        <summary className="cursor-pointer text-xs text-[var(--muted)]">
          Raw text & JSON (console also logs on read)
        </summary>
        <pre className="mt-2 overflow-x-auto rounded bg-[var(--card)] p-3 text-xs">
          {textBlock}
        </pre>
        <pre className="mt-2 overflow-x-auto rounded bg-[var(--card)] p-3 text-xs">
          {json}
        </pre>
      </details>
    </div>
  );
}

/** Log parameters to browser console in readable form */
export function logParameters(parameters: ParameterRecord[], label = "EEDI parameters") {
  console.group(label);
  console.table(
    parameters.map((p) => ({
      name: p.name,
      value: p.value,
      description: p.description,
    })),
  );
  console.log("Lines (name, value, description):\n" + formatParameterBlock(parameters));
  console.log("JSON:", parameters);
  console.groupEnd();
}
