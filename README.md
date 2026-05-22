# ARTI Small Calculators (Small Code Hub)

A single home page for engineering calculator tools. Each tool is listed as a card/button; clicking opens the calculator page.

**Stack:** Next.js · Vercel · GitHub

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Add a new calculator

1. **`src/lib/tools.ts`** — add a new entry:

```ts
{
  id: "pipe-diameter",
  title: "Pipe Diameter Calculator",
  description: "Pipe sizing from flow rate and velocity.",
  href: "/pipe-diameter",
  category: "Mechanical",
},
```

2. **`src/app/pipe-diameter/page.tsx`** — create the calculator page (copy the `example-calc` folder as a starting point).

3. Refresh the dev server; the new card appears on the home page.

### External project (separate GitHub repo)

If a tool lives in its own Vercel project:

```ts
{
  id: "external-tool",
  title: "External Calculator",
  description: "...",
  href: "https://your-project.vercel.app",
  external: true,
},
```

## Deploy with GitHub + Vercel

**Repository:** [github.com/serdaryaras/small_calculators](https://github.com/serdaryaras/small_calculators)

```bash
git remote add origin https://github.com/serdaryaras/small_calculators.git
git push -u origin main
```

### Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import **serdaryaras/small_calculators**.
2. Framework: **Next.js** (auto-detected). Root directory: `.` — click **Deploy**.
3. Production URL: `https://small-calculators.vercel.app` (or similar).

Every push to `main` triggers an automatic redeploy.

## Folder structure

```
src/
  app/
    page.tsx          ← Home page (cards/buttons)
    example-calc/     ← Example calculator page
  components/
    ToolCard.tsx      ← Home page card
    ToolLayout.tsx    ← Calculator page shell
  lib/
    tools.ts          ← Registry of all tools
```
