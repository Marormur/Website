# Testing Strategy

This project uses Playwright for E2E tests. To keep development fast and reliable, we run two flavors of tests:

- Basic smoke suite (local default): quick checks on Chromium only
- Full suite (CI and local on demand): comprehensive coverage and cross-browser

## Suites

- Basic smoke: specs matching `*basic.spec.js` or tagged as `basic`; runs on Chromium only
- Full E2E: all specs across Chromium/Firefox/WebKit in CI

## How to run

- Quick smoke run (local):
    - VS Code task: "E2E: Test (basic smoke)"
    - NPM script: `npm run test:e2e:quick`

- Full E2E (local):
    - Single browser (Chromium): `npm run test:e2e:chromium`
    - All browsers: `npm run test:e2e:all-browsers`

- Headed/UI modes:
    - Headed: `npm run test:e2e:headed`
    - UI: `npm run test:e2e:ui`

## Stability controls

To avoid flakiness and rate limiting (especially in Finder tests that can hit the GitHub API), we provide the following stabilizers:

- GitHub API mocks: set `MOCK_GITHUB=1` to enable route mocks for common Finder flows. The VS Code smoke task enables this by default.
- Server reuse: tests reuse the dev server locally; CI starts a fresh server automatically.
- Concurrency: local runs use 2 workers by default to balance speed and stability; CI uses 1.
- Retries: local runs retry once on failure; CI retries twice.
- Timeouts: slightly more generous action/navigation timeouts are configured for stability.

## Environment variables

- `MOCK_GITHUB=1` — Enables built-in mocks for common GitHub API endpoints used by Finder (smoke tests).
- `CI=1` — Triggers CI profile (single worker, all browsers, extra retries).

## Troubleshooting

- Tests hang at start: ensure the dev server is running on http://127.0.0.1:5173 (VS Code tasks start it automatically).
- Network/rate limit errors: rerun with `MOCK_GITHUB=1` (default in smoke task) or check your network.
- Flaky timing: prefer explicit UI waits over `waitForTimeout`. If a short delay is unavoidable (e.g., for drag/drop DOM updates), keep it minimal and add a comment.

## Notes

- Tests wait for `window.__APP_READY === true` instead of `networkidle` for consistent startup.
- Finder tests assume the GitHub username `Marormur`. If you change it, also update test mocks in `tests/e2e/utils.js`.
