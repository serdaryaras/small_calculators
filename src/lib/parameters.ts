/** Shared parameter record: name · value · description */

export type ParameterRecord = {
  name: string;
  value: string | number | boolean;
  description: string;
};

/** Serialize one parameter as: name, value, description */
export function formatParameterLine(p: ParameterRecord): string {
  return `${p.name}, ${p.value}, ${p.description}`;
}

export function formatParameterBlock(params: ParameterRecord[]): string {
  return params.map(formatParameterLine).join("\n");
}
