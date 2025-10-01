# RevOpsII Dashboard

A single-page RevOps dashboard that visualises marketing, pipeline, and revenue metrics with interactive charts, AI-style insights, and a lightweight co-pilot drawer. Data is sourced from `data/dashboard_data.json` and rendered client-side with Chart.js.

## Highlights

- 📊 Four dashboard views (Overview, Marketing, Pipeline, Revenue) with a fully responsive layout that adapts from widescreen down to handheld breakpoints
- 🎯 Period and segment filters that instantly recompute KPIs, charts, and insights with no page reloads
- 🔄 Data-driven cards, tables, and charts populated from a consolidated JSON feed
- 🎨 Built-in "Design 1 / Design 2" toggle so you can preview two distinct visual treatments without touching the data layer
- 📥 Built-in "Insights Drawer" that surfaces contextual insights from the loaded data
- 🛡️ Status banner with graceful error handling for data load failures
- 📁 Modern project scaffolding with npm scripts and static serving via `serve`

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later

### Install dependencies

```sh
npm install
```

### Run the dev server

```sh
npm start
```

This launches a static server on http://localhost:4173 and automatically reloads `index.html`, `style.css`, and `app.js` when changed.

> **Heads up:** Because the app uses `fetch` to load JSON, opening `index.html` directly from the filesystem will fail with CORS/security restrictions. Always run it behind a local server (npm start, `python3 -m http.server`, etc.).

### Mobile navigation tips

- On screens ≤ 1024px a compact menu button appears in the header; tap it to open or close the sidebar navigation.
- The shared overlay locks page scrolling while the sidebar or AI drawer is open. Tapping the dimmed background or pressing the Escape key closes the active drawer.
- A "Skip to main content" link is pinned for keyboard users—press <kbd>Tab</kbd> once from the top of the page to jump straight to dashboard content.

### Switching between the two designs

- Use the **Design 1 / Design 2** pill switch in the header to swap between the original glassmorphism-inspired layout and a lighter gradient-forward alternative.
- Your choice is remembered per browser via `localStorage`, so refreshes keep the last design you selected.
- The toggle only touches presentation—data fetching, filters, and insights stay identical across both themes.

### Alternative quick start (Python)

```sh
python3 -m http.server 4173
```

Then browse to `http://localhost:4173/index.html`.

## Project Structure

```
.
├── index.html              # Main HTML shell
├── style.css               # Theme tokens, layout, and component styles
├── app.js                  # Dashboard logic, data fetching, chart rendering
├── data/
│   └── dashboard_data.json # Consolidated marketing, pipeline, revenue dataset
├── package.json            # npm scripts and dev dependency (serve)
└── README.md               # This document
```

Legacy files (`dashboard_data.json`, `dashboard_data_1.json`, `script.py` etc.) remain for reference, but the live app reads exclusively from `data/dashboard_data.json`.

## Customising the Data

Edit `data/dashboard_data.json` to update metrics, channels, revenue segments, or benchmarks. The app normalises common schema variations (arrays vs. grouped objects) and will refresh on reload.

## Tech Notes

- Charts are rendered with the Chart.js CDN build declared in `index.html`.
- KPI meta badges display contextual insights (trend vs. prior month, weighted pipeline, channel count, etc.).
- The Insights Drawer is a deterministic rules engine; extend `buildInsights()` in `app.js` for richer messaging.
- Responsive behaviour is primarily handled in `style.css` with flexbox/grid layouts and breakpoint tweaks; `app.js` manages off-canvas navigation and overlay state so the sidebar and drawer play nicely together.
- Theme switching is orchestrated by `setupDesignToggle()` in `app.js`, which applies body-level classes and CSS variable overrides declared in `style.css`.

## Next Steps

- Add haptic feedback or lightweight animations when switching views on touch devices.
- Expand AI responses with natural-language templates powered by actual LLM APIs.
- Add automated tests around data normalisation, responsive helpers, and chart configuration to prevent regressions.
