# Salem Daily
Static PWA (React + TS + Vite + Tailwind). No backend; hosted on GitHub Pages.

## Deploy
1. Push this repo to GitHub (branch `main`).
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml` (type-check, build, deploy).

## Local
`npm install && npm run dev` · `npm run build`

## Content
JSON lives in `public/data/` (devotions, categories, `daily-verse.json`, `bibles/index.json` + one file per translation).
Bible file shape: `{"meta":{"id","name","language","license"},"books":[{"name","chapters":[["verse 1","verse 2"]]}]}`.
To add a translation: put the file in `public/data/bibles/` and add an entry to `bibles/index.json`.
Only add NIV/NKJV/Sinhala/Tamil texts you have the legal right to distribute.

## Admin (no backend)
Open `#/admin` in the URL (not linked in navigation). It is a local editing tool, NOT secure authentication. Edit, then **Export** the JSON files and upload them to `public/data/` via GitHub's "Add file → Upload files". Pushing to `main` redeploys automatically. No tokens are ever used in the browser.

## Offline
The service worker caches the app shell and any data files you have opened. Translations are available offline only after being viewed once.
