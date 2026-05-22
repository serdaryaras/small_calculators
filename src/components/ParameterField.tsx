import type { ReactNode } from "react";

export type ParameterMeta = {
  name: string;
  description: string;
};

const inputClass =
  "w-full max-w-xs rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums outline-none focus:border-[var(--accent)]";

type BaseProps = ParameterMeta & {
  className?: string;
};

/** Layout: {name}, {value}, {description} */
export function ParameterField({
  name,
  description,
  value,
  className = "",
}: BaseProps & { value: ReactNode }) {
  return (
    <div
      className={`grid gap-2 border-b border-[var(--card-border)] py-4 last:border-b-0 sm:grid-cols-[minmax(10rem,1fr)_minmax(8rem,12rem)] sm:items-start ${className}`}
    >
      <div className="sm:col-span-1">
        <p className="text-sm font-semibold text-[var(--foreground)]">{name}</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{description}</p>
      </div>
      <div className="sm:col-span-1 sm:justify-self-end sm:text-right">{value}</div>
    </div>
  );
}

export function ParameterTextInput({
  name,
  description,
  value,
  onChange,
  placeholder,
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <ParameterField
      name={name}
      description={description}
      value={
        <input
          type="text"
          className={`${inputClass} sm:ml-auto`}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      }
    />
  );
}

export function ParameterNumberInput({
  name,
  description,
  value,
  onChange,
  min,
  step = 1,
  placeholder,
}: BaseProps & {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <ParameterField
      name={name}
      description={description}
      value={
        <input
          type="number"
          className={`${inputClass} sm:ml-auto`}
          value={value}
          min={min}
          step={step}
          placeholder={placeholder}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      }
    />
  );
}

export function ParameterSelect<T extends string>({
  name,
  description,
  value,
  onChange,
  options,
}: BaseProps & {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <ParameterField
      name={name}
      description={description}
      value={
        <select
          className={`${inputClass} sm:ml-auto`}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      }
    />
  );
}

export function ParameterCheckbox({
  name,
  description,
  checked,
  onChange,
}: BaseProps & {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <ParameterField
      name={name}
      description={description}
      value={
        <label className="inline-flex cursor-pointer items-center gap-2 sm:ml-auto">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          <span className="text-sm tabular-nums">{checked ? "Yes" : "No"}</span>
        </label>
      }
    />
  );
}

export function ParameterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
      <h3 className="border-b border-[var(--card-border)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h3>
      <div className="px-4">{children}</div>
    </section>
  );
}
