# Contributing

1. Run `npm run dev` with Node.js 22 or newer.
2. Edit content in `docs/data/project.json`.
3. Edit the interface in `docs/index.html` and `docs/styles.css`.
4. Edit 3D behavior in `docs/viewer.js` and wizard behavior in `docs/wizard.js`.
5. Run `npm run build` before sharing changes.

The local server reloads the browser after a file changes. It regenerates the assembly guide, BOM, and document pack when `project.json` changes.

Use one part name for each physical component. Record measurements, source documents, units, and part revisions. Distinguish translated statements from new engineering decisions. Do not replace unknown values with assumptions that appear verified.

The website has no CDN requests, application framework, bundler, or required package installation. Browser checks use Playwright as an optional development dependency. See the README for details.

For a hardware change, update the CAD, print inventory, BOM, assembly instructions, and build notes together. Include photographs and measured checks when available. Do not report mesh closure as proof of printability or physical fit.

Confirm rights before redistributing third-party design files or media.
