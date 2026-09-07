# FlowWatch PWA

A mobile-first Angular 17 progressive web app demonstrating a water-network monitoring dashboard.

## Features

- Installable PWA with web app manifest and Angular service worker
- App-shell and API caching for offline use
- Responsive mobile, tablet and desktop layouts
- Online/offline status and cached-data messaging
- Update-available workflow
- Accessible semantic HTML, keyboard focus and SVG chart description
- Mock sites, telemetry and alert views tailored to a monitoring use case
- Live river-discharge data and forecasts from the Open-Meteo Global Flood API (GloFAS)
- Real data for four Lancashire locations, with demo data used only as a resilient fallback

## Run locally

```bash
npm install
npm start
```

The service worker is enabled only in a production build:

```bash
npm run build
npx http-server dist/water-monitor-pwa/browser -p 8080
```

Open `http://localhost:8080`, then use the browser install option. In DevTools, switch the Network tab to Offline and reload to verify cached operation.

## Deploy

The included GitHub Actions workflow builds and deploys the PWA to GitHub Pages whenever the `main` branch is updated. In the repository settings, set **Pages → Source** to **GitHub Actions**.

## Notes

This is an independent portfolio demo and is not affiliated with or built for Detectronic. It uses river-discharge data from the Open-Meteo Global Flood API, based on GloFAS. Demo data is shown only if the public API is unavailable.
