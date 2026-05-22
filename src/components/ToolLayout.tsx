import Link from "next/link";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function ToolLayout({ title, description, children }: Props) {
  return (
    <div>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--accent)]"
      >
        ← Home
      </Link>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-2 text-[var(--muted)]">{description}</p>
        )}
      </header>
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        {children}
      </section>
    </div>
  );
}
