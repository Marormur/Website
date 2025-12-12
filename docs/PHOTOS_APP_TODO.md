# Photos App Integration - Remaining Steps

## Status (28. Oktober 2025)

✅ **Completed:**

- TypeScript source: `src/ts/photos-app.ts` (1,006 lines)
- Compiled JavaScript: `js/photos-app.js` + source map
- i18n translations: German + English (complete UI coverage)
- CSS styles: `.photos-sidebar-button`, `.photos-segment-button`, `.photos-card`
- TypeScript strict mode fix in `multi-instance-integration.ts`
- Successful builds: `npm run build:ts` ✅, `npm run build:css` ✅

## ❌ Missing (Blocking Merge):

### 1. HTML Modal Integration (HIGH PRIORITY)

**File:** `index.html`  
**Action:** Replace old `#image-modal` (simple image viewer) with new Photos App Modal

**Details:**

- Old modal: Lines 628-665 in current `index.html` (simple image preview)
- New modal: ~247 lines with:
    - Sidebar (Library, Filters, Refresh button)
    - Segment controls (Moments/Collections/Years)
    - Search input
    - Gallery grid
    - Detail overlay
    - Loading/Error states
    - Empty states
- Source: `git show codex/create-custom-macos-photos-app:index.html` (lines ~660-907)

**Why not done yet:** Token limits + complexity (247 lines HTML with nested structure)

**How to complete:**

```bash
# Extract Photos Modal from PR branch
git show codex/create-custom-macos-photos-app:index.html | \
  sed -n '/<!-- Bildbetrachter Modal -->/,/<!-- Launchpad Modal -->/p' | \
  head -n -1 > photos-modal-extract.html

# Manually replace lines 628-665 in index.html with extracted content
# Verify: Search for data-i18n="photos.* attributes
```

### 2. Finder Integration Hook

**File:** `js/finder-instance.js` (or TypeScript source if exists)  
**Action:** Add `window.PhotosApp.showExternalImage()` call when opening images

**Code to add:**

```javascript
// After image load logic
if (
    window.PhotosApp &&
    typeof window.PhotosApp.showExternalImage === 'function'
) {
    window.PhotosApp.showExternalImage({ src, name });
}
```

**Location:** Search for `window.API?.window?.open('image-modal')` in finder-instance

### 3. E2E Tests (REQUIRED per Copilot Instructions)

**File:** `tests/e2e/photos-app.spec.js`  
**Coverage:**

- Gallery rendering after Picsum API fetch
- Filter functionality (All/Favorites/Landscape/Portrait/Square)
- Search by photographer
- Detail view navigation (prev/next buttons)
- Favorite toggle
- i18n language switch (DE ↔ EN)
- External image display via Finder

**Mock setup:**

```javascript
// Mock Picsum API in tests/e2e/utils.js
if (process.env.MOCK_GITHUB === '1') {
    // Mock https://picsum.photos/v2/list responses
}
```

### 4. CHANGELOG Entry

**File:** `CHANGELOG.md`  
**Section:** `## [Unreleased] > ### Added`  
**Entry:**

```markdown
- **Photos App**: macOS-style photo gallery with Picsum API integration
    - Three view modes: Moments (by author), Collections (by orientation), Years (2014-2024)
    - Filtering: All Photos, Favorites, Landscape, Portrait, Square
    - Search by photographer name
    - Detail view with navigation, favorite toggle, download, external link
    - Full i18n support (German/English) with 90+ translation keys
    - External image support for Finder integration
    - Client-side favorite management (session-only)
```

### 5. Local Verification ("Kleiner Nachweis")

**Commands:**

```powershell
npm run typecheck          # ✅ Already passing
npm run lint               # ⚠️ Run to verify
node scripts/dev-server-ensure.js
$env:USE_NODE_SERVER=1; $env:MOCK_GITHUB=1; npm run test:e2e:quick
```

### 6. PR #27 Closure

**Action:** Close outdated PR #27 with comment:

> Closed as outdated (20+ commits behind develop, incompatible with Bundle migration).  
> Superseded by #[NEW_PR_NUMBER].  
> All features re-implemented cleanly on current `develop` branch with:
>
> - TypeScript strict mode compliance
> - Bundle-compatible module loading
> - E2E test coverage
> - Current i18n system integration

## Estimated Completion:

- HTML integration: ~30 minutes (manual extraction + replace + verify)
- Finder hook: ~5 minutes
- E2E tests: ~45 minutes (with Picsum mock)
- CHANGELOG: ~2 minutes
- Local verification: ~10 minutes
- **Total: ~1.5 hours**

## Next Immediate Action:

**Integrate HTML Modal** - this unblocks visual testing and E2E test development.
