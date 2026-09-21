# Google-Fonts · Font Explorer

A searchable Google Fonts catalog and live typography playground, maintained by **Shakil Hossain**.

**Website:** https://shakil0501.github.io/Google-Fonts/

## Explore

- Search by family name and combine category and language/script filters.
- Switch to Bengali with one click and preview Bengali sample text.
- Type your own sample and change its size, weight, and italic style.
- Preview the closest style actually available in each family; no synthetic bold or italic.
- Save favorites in your browser, with a Saved collection for quick access.
- Copy an @import and CSS declaration for the exact displayed font style.
- Light and dark themes, keyboard-accessible controls, responsive cards, and paginated results.
- Fonts load only as cards approach the viewport; unavailable previews are clearly labeled.

Favorites and theme preferences stay in local browser storage. Live font previews connect to fonts.googleapis.com and fonts.gstatic.com. Search and filters use the bundled catalog.

## Run locally

Requires Node.js 22 or newer.

```bash
npm ci
npm test
npm run build
npm run dev
```

Open http://127.0.0.1:4173. Run the build again after source changes. Serve the site over HTTP rather than opening index.html directly.

## GitHub Pages

The repository includes a built `gh-pages` branch as a publishing fallback. Pages is currently configured to publish that branch. This is a static snapshot; changes on `main` do not rebuild it while Actions is unavailable.

The `Publish Font Explorer` workflow tests and builds the site, then publishes only `dist/`. It runs on pushes to `main`, manual dispatch, and successful catalog updates.

In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source. The website address is https://shakil0501.github.io/Google-Fonts/. Deployment status is available under the Actions tab.

At initial setup, GitHub reported “Actions has been disabled for this user.” Account-level Actions access must be restored before scheduled updates, automated browser checks, or workflow deployment can run. Repository-level Actions permissions are already enabled. After access is restored, switch the Pages source to GitHub Actions and run `Publish Font Explorer` and `Update font catalog` from the Actions tab.

## Automatic catalog updates

The `Update font catalog` workflow runs every Monday at 03:17 UTC and can also be started manually from Actions.

```bash
npm run update
```

Without a key, the updater syncs metadata from Hasin Hayder's upstream index. Its freshness depends on that index. If metadata hasn't changed, it does not create a commit or change the catalog timestamp.

For updates directly from Google's Developer API, add a repository Actions secret named `GOOGLE_FONTS_API_KEY` containing a key with the Web Fonts Developer API enabled. Locally, provide the same environment variable. Never put the key in source files. The browser does not need this key.

Updates validate all metadata and generate replacement indexes before changing tracked data. Duplicate families, unsafe path segments, empty variants, and a catalog shrinking by more than 20% are rejected. Updated JSON is committed by the workflow only after tests and a build succeed.

## JSON data

Existing consumer paths are preserved:

| Path | Contents |
| --- | --- |
| `fonts.json` | Font family names |
| `fonts/<slug>.json` | Family metadata, variants, scripts, and category |
| `categories.json` | Available categories |
| `categories/<category>/fonts.json` | Fonts in one category |
| `categories/<category>/<subset>/fonts.json` | Category and script intersection |
| `subsets.json` | Available scripts |
| `subsets/<subset>/fonts.json` | Fonts supporting one script |
| `subsets/<subset>/<category>/fonts.json` | Script and category intersection |
| `updated.json` | Source catalog timestamp |

Example CDN URL (pin a commit instead of `main` when reproducibility matters):

```text
https://cdn.jsdelivr.net/gh/shakil0501/Google-Fonts@main/fonts.json
https://cdn.jsdelivr.net/gh/shakil0501/Google-Fonts@main/subsets/bengali/fonts.json
```

## Development and checks

- `site/`: dependency-free browser application and styles.
- `scripts/`: validated catalog generation, update, build, and local server.
- `tests/`: Node unit and dataset integrity tests.
- `e2e/`: browser tests for filters, favorites, previews, CSS, and responsive layouts.

```bash
npm run test:e2e
```

Browser tests use installed Google Chrome by default. CI installs Chrome using Playwright. Font network requests are mocked in interaction tests so results do not depend on Google Fonts availability; live font loading should also be checked when network access is available.

## License and credits

Original catalog: **Shakil Hossain** And **Hasin Hayder**, Copyright © 2026, MIT (see [LICENSE](LICENSE)).

Font Explorer and enhancements: **Shakil Hossain**, Copyright © 2026, MIT.

This is an independent project, not an official Google product.
