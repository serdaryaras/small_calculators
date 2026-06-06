import { createContext, useContext, useRef, type ReactNode } from "react";

const SECTION_TONE_COUNT = 8;

const SectionToneContext = createContext<(() => number) | null>(null);

/** Assigns a distinct colored shadow to each ParameterSection in document order. */
export function SectionToneProvider({ children }: { children: ReactNode }) {
  const indexRef = useRef(0);
  const nextTone = () => {
    const tone = indexRef.current % SECTION_TONE_COUNT;
    indexRef.current += 1;
    return tone;
  };
  return (
    <SectionToneContext.Provider value={nextTone}>{children}</SectionToneContext.Provider>
  );
}

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
  tone,
}: {
  title: string;
  children: ReactNode;
  /** 0–7 shadow palette; auto-assigned when wrapped in SectionToneProvider. */
  tone?: number;
}) {
  const nextTone = useContext(SectionToneContext);
  const resolvedTone = tone ?? nextTone?.() ?? 0;
  const toneClass = `section-card--tone-${resolvedTone % SECTION_TONE_COUNT}`;

  return (
    <section className={`section-card ${toneClass}`}>
      <h3 className="section-card__header">{title}</h3>
      <div className="px-4">{children}</div>
    </section>
  );
}
