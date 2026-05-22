import type { Metadata } from "next";
import { ArtiLogo } from "@/components/ArtiLogo";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARTI Small Calculators",
  description: "Engineering calculator tools hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <ArtiLogo />
            <span className="text-sm text-[var(--muted)]">Next.js · Vercel</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
