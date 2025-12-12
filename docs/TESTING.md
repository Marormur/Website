# Testing Strategy

This project uses Playwright for E2E tests. To keep development fast and reliable, we run two flavors of tests:

- Basic smoke suite (local default): quick checks on Chromium only
- Full suite (CI and local on demand): comprehensive coverage and cross-browser

## Test Suites

- **Basic smoke**: Specs matching `*basic.spec.js` or tagged as `basic`; runs on Chromium only (~20 tests, ~5s)
- **Full E2E**: All specs across Chromium/Firefox/WebKit in CI (~120 tests, ~40s Chromium-only)

## How to Run

### Quick Smoke (Recommended for Development)

- **VS Code task**: "E2E: Test (basic smoke)" (includes MOCK_GITHUB=1)
- **NPM script**: `npm run test:e2e:quick`
- **Manual with mocks**:
    - PowerShell (Windows): `$env:MOCK_GITHUB='1'; npm run test:e2e:quick`
    - Bash/Zsh (macOS/Linux): `MOCK_GITHUB=1 npm run test:e2e:quick`

### Full E2E Suite

- **Single browser (Chromium)**: `npm run test:e2e:chromium`
- **All browsers**: `npm run test:e2e:all-browsers`
- **Default** (Chromium locally, all in CI): `npm run test:e2e`

### Interactive Modes

- **Headed** (visible browser): `npm run test:e2e:headed`
- **UI mode** (Playwright UI): `npm run test:e2e:ui`

## Stability Controls

To avoid flakiness and rate limiting (especially in Finder tests that can hit the GitHub API), we provide the following stabilizers:

- **GitHub API mocks**: Set `MOCK_GITHUB=1` to enable route mocks for common Finder flows. The VS Code smoke task enables this by default.
- **Server reuse**: Tests reuse the dev server locally; CI starts a fresh server automatically.
- **Concurrency**: Local runs use 2 workers by default to balance speed and stability; CI uses 1.
- **Retries**: Local runs retry once on failure; CI retries twice.
- **Timeouts**: Slightly more generous action/navigation timeouts are configured for stability.

## Environment Variables

### Test Configuration

- **`MOCK_GITHUB=1`** — Enables built-in mocks for common GitHub API endpoints used by Finder (smoke tests). **Highly recommended** to avoid rate limiting during development.
- **`CI=1`** — Triggers CI profile (single worker, all browsers, extra retries).
- **`USE_NODE_SERVER=1`** — Forces use of Node server instead of potentially already-running dev server.

### Build Configuration

- **`USE_BUNDLE=1`** — ✅ **Implemented (October 28, 2025)** — Loads `js/app.bundle.js` instead of individual module scripts via conditional loading in `index.html`. Set this env var before running tests to test bundle mode.

## Testing with Bundle vs Individual Scripts

**Current Status (October 28, 2025):**

✅ **Conditional loading implemented** — Tests can run in either mode:

- **Default Mode (Individual Scripts):** Traditional `<script>` tag loading (backwards compatible)
- **Bundle Mode (USE_BUNDLE=1):** Single `app.bundle.js` IIFE bundle via esbuild

Both modes are fully tested and functional (20/20 E2E tests pass in each mode).

**Implementation:**

`index.html` uses a `USE_BUNDLE` flag with 3 sources (priority order):

1. **Env injection** (`window.__USE_BUNDLE__`) — for E2E tests via Playwright `addInitScript`
2. **URL parameter** (`?bundle=1`) — for manual browser testing
3. **localStorage** (`USE_BUNDLE=1`) — for user preference persistence

```javascript
// In index.html (simplified):
window.USE_BUNDLE =
    bundleFromEnv || bundleFromUrl || bundleFromStorage || false;

if (window.USE_BUNDLE) {
    document.write('<script src="./js/app.bundle.js"><\/script>');
} else {
    // Load 30+ individual scripts via document.write()
}
```

**How to Test Bundle:**

```bash
# Build bundle first
npm run build:bundle

# Run E2E tests in bundle mode
# PowerShell (Windows):
$env:USE_BUNDLE='1'; $env:MOCK_GITHUB='1'; npm run test:e2e:quick

# Bash/Zsh (macOS/Linux):
USE_BUNDLE=1 MOCK_GITHUB=1 npm run test:e2e:quick

# VS Code Tasks (cross-platform, recommended):
# - "E2E: Test (Bundle Mode - Quick)"
# - "E2E: Test (Bundle Mode - Full)"

# Manual browser testing
open "http://127.0.0.1:5173/index.html?bundle=1"
```

**Test Results (October 28, 2025):**

- **Default Mode:** 20/20 tests pass ✅ (5.3s)
- **Bundle Mode:** 20/20 tests pass ✅ (6.5s)

**Migration Path:**

1. ✅ **Phase 1:** Individual scripts only (historical)
2. ✅ **Phase 2:** Conditional loading implemented; both modes tested
3. 📋 **Phase 3:** Set bundle as default mode (flip `USE_BUNDLE` default to `true`)
4. 📋 **Phase 4:** Remove individual script loading code; bundle-only mode

**Verification in Tests:**

```javascript
// Check bundle loaded correctly
await page.evaluate(() => {
    return {
        bundleReady: window.__BUNDLE_READY__, // Set by bundle
        domUtils: typeof window.DOMUtils, // Exposed by compat layer
        useBundle: window.USE_BUNDLE, // Flag value
    };
});
```

## Troubleshooting

- Tests hang at start: ensure the dev server is running on http://127.0.0.1:5173 (VS Code tasks start it automatically).
- Network/rate limit errors: rerun with `MOCK_GITHUB=1` (default in smoke task) or check your network.
- Flaky timing: prefer explicit UI waits over `waitForTimeout`. If a short delay is unavoidable (e.g., for drag/drop DOM updates), keep it minimal and add a comment.

## Notes

- Tests wait for `window.__APP_READY === true` instead of `networkidle` for consistent startup.
- Finder tests assume the GitHub username `Marormur`. If you change it, also update test mocks in `tests/e2e/utils.js`.
