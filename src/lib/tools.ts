export type Tool = {
  id: string;
  title: string;
  description: string;
  href: string;
  category?: string;
  /** Set true for external Vercel projects; href must be a full URL */
  external?: boolean;
  /** Show as disabled on the home page when not ready yet */
  disabled?: boolean;
};

/**
 * To add a new calculator:
 * 1. Add a Tool entry to this list
 * 2. Create the page at src/app/<slug>/page.tsx
 */
export const tools: Tool[] = [
  {
    id: "eedi",
    title: "EEDI Calculator",
    description: "Attained & required EEDI — Phase 3 (ships from 1 Jan 2025), MEPC.308(73).",
    href: "/eedi",
    category: "Maritime",
  },
  {
    id: "tank-capacities",
    title: "Tank Capacities",
    description: "Tank volume and capacity calculations.",
    href: "/tank-capacities",
    category: "Mechanical",
  },
  {
    id: "example-calc",
    title: "Example Calculator",
    description: "Template page for new tools. Copy this to build your own calculator.",
    href: "/example-calc",
    category: "Template",
    disabled: true,
  },
];

export function getToolById(id: string): Tool | undefined {
  return tools.find((t) => t.id === id);
}
