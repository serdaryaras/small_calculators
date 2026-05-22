import { ToolCard } from "@/components/ToolCard";
import { tools } from "@/lib/tools";

export default function HomePage() {
  const activeTools = tools.filter((t) => !t.disabled);
  const upcomingTools = tools.filter((t) => t.disabled);

  return (
    <div>
      <section className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Calculator Tools</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Access your engineering calculators from one place. Each tool has its
          own page; to add a new one, update{" "}
          <code className="rounded bg-[var(--card)] px-1.5 py-0.5 text-sm">
            src/lib/tools.ts
          </code>
          .
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {activeTools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>

      {upcomingTools.length > 0 && (
        <>
          <h2 className="mb-4 mt-10 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Coming soon
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {upcomingTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </>
      )}

      {tools.length === 0 && (
        <p className="rounded-xl border border-dashed border-[var(--card-border)] p-8 text-center text-[var(--muted)]">
          No tools registered yet. Add your first tool in{" "}
          <code className="text-sm">src/lib/tools.ts</code>.
        </p>
      )}
    </div>
  );
}
