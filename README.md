
# RevOpsII Dashboard

**A modern, responsive dashboard for visualizing marketing, pipeline, and revenue data.**

## Architecture

```mermaid
%% See architecture.mmd for the editable source
graph TD
  A[User] -->|Browser| B[HTML/CSS/JS Frontend]
  B --> C[Chart.js]
  B --> D[Dashboard Logic (app.js)]
  D --> E[Static Data (dashboard_data.json)]
  D --> F[Insights Drawer]
  B --> G[Design Toggle]
  B --> H[Responsive Layout]
```

## Run in 5 Minutes

1. **Clone the repo:**
	```sh
	git clone https://github.com/gabedossantos/revOpsII.git
	cd revOpsII
	```
2. **Run setup:**
	```sh
	bash setup.sh
	```
3. **Start the app:**
	```sh
	npm start
	```
4. **Open:** [http://localhost:4173](http://localhost:4173)

## Seed Data

Sample data is provided in `data/seed_dashboard_data.json`. To reset, copy it over `data/dashboard_data.json`:

```sh
cp data/seed_dashboard_data.json data/dashboard_data.json
```

## Features

- Interactive charts (Chart.js)
- Insights Drawer for contextual tips
- Design 1 / Design 2 theme toggle
- Fully responsive layout
- Simple static data (no backend required)

## Project Structure

```
├── app.js
├── index.html
├── style.css
├── data/
│   ├── dashboard_data.json
│   └── seed_dashboard_data.json
├── architecture.mmd
├── setup.sh
├── package.json
└── README.md
```

## Customization

Edit `data/dashboard_data.json` to update metrics, channels, or revenue segments. Extend `app.js` for new logic or insights.

---
**Questions?** Open an issue or PR on GitHub.
