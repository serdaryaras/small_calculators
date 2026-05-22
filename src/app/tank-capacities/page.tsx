import { ToolLayout } from "@/components/ToolLayout";

export default function TankCapacitiesPage() {
  return (
    <ToolLayout
      title="Tank Capacities"
      description="Tank volume and capacity calculations."
    >
      <p className="text-sm text-[var(--muted)]">
        Calculator inputs and formulas will be added here. Share your tank
        geometry and capacity rules to complete this page.
      </p>
    </ToolLayout>
  );
}
