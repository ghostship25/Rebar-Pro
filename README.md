# REBAR-PRO — BBS & Cutting Optimizer

A civil engineering command centre for preparing Bar Bending Schedules (BBS): rebar
detailing to IS 2502 / BS 8666, structural member wizards, section templates, custom
shape design, 1D cutting-stock optimization, and print-ready / Excel export.

This is a self-contained client-side app — no backend or API key required. All data is
kept locally in your browser (`localStorage`); use **Export → Save Project File (.bbs)**
to back up or share a project.

## Run locally

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

Then open the printed local URL (defaults to `http://localhost:3000`).

## Build for production

```bash
npm run build
npm run preview   # optional: preview the production build locally
```

## Type-check

```bash
npm run lint
```
