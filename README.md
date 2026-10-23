# Solar and battery ROI calculator

Static browser application comparing solar and battery proposals against household consumption, historical weather and electricity prices. Calculations run in Web Workers and completed results are cached in each browser's IndexedDB.

This published copy intentionally includes household and proposal JSON data. It excludes PDFs, original invoices and quote/source-image attachments. All calculations are provisional and rely on the assumptions shown in the app.

GitHub Actions deploys the main branch to GitHub Pages. Hash-based routes support direct navigation. The WebAssembly optimizer runs entirely in the browser; external weather and price services require internet access.
