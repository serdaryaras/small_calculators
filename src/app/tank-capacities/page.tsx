import Link from "next/link";

/**
 * Tank Capacities is the 02b / tank-cap.vercel.app UI embedded full-bleed.
 * Hub chrome is covered so the calculator matches the published app exactly.
 */
export default function TankCapacitiesPage() {
  return (
    <>
      <Link
        href="/"
        className="fixed left-3 top-3 z-50 rounded-md border border-slate-300 bg-white/95 px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:border-slate-400 hover:text-slate-900"
      >
        ← Hub
      </Link>
      <iframe
        src="/tank-cap/index.html"
        title="ARTI Tank Capacities"
        className="fixed inset-0 z-40 h-[100dvh] w-screen border-0 bg-white"
      />
    </>
  );
}
