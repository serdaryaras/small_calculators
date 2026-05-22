import Link from "next/link";
import type { Tool } from "@/lib/tools";

type Props = {
  tool: Tool;
};

export function ToolCard({ tool }: Props) {
  const isDisabled = tool.disabled;
  const className = [
    "group flex flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 transition",
    isDisabled
      ? "cursor-not-allowed opacity-50"
      : "hover:border-[var(--accent)] hover:shadow-md",
  ].join(" ");

  const content = (
    <>
      {tool.category && (
        <span className="mb-2 inline-block w-fit rounded-full bg-[var(--background)] px-2.5 py-0.5 text-xs text-[var(--muted)]">
          {tool.category}
        </span>
      )}
      <h2 className="text-lg font-semibold group-hover:text-[var(--accent)]">
        {tool.title}
      </h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">
        {tool.description}
      </p>
      <span className="mt-4 text-sm font-medium text-[var(--accent)]">
        {isDisabled ? "Coming soon" : "Open calculator →"}
      </span>
    </>
  );

  if (isDisabled) {
    return <article className={className}>{content}</article>;
  }

  if (tool.external) {
    return (
      <a
        href={tool.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={tool.href} className={className}>
      {content}
    </Link>
  );
}
