# Window-Tabs TypeScript Migration - Testing Guide

## Overview

This document provides a comprehensive testing guide for the window-tabs TypeScript migration. The migration ensures that:

1. Tab content remains visible after closing a tab (no ghost tabs)
2. The newly active instance's content is explicitly shown via `onTabSwitch` callback
3. Full TypeScript strict mode compliance
4. All keyboard shortcuts continue to work

## What Was Changed

### Source Code

- **Source of Truth**: `src/ts/window-tabs.ts` (TypeScript)
- **Generated Output**: `js/window-tabs.js` (do NOT edit directly)
- **Type Definitions**: `types/window-tabs.d.ts`

### Key Fixes Applied

#### Fix 1: Content Visibility After Tab Close

**Location**: `src/ts/window-tabs.ts` lines 229-235 (constructor close handler)

```typescript
(id) => {
  this.opts.onTabClose?.(id);
  this.manager.destroyInstance(id);

  // After destroying, get the new active instance and trigger onTabSwitch
  // to ensure its content is visible (fixes ghost tab / hidden content issue)
  const remaining = this.manager.getAllInstances();
  if (remaining.length === 0) {
    this.opts.onAllTabsClosed?.();
  } else {
    const newActive = this.manager.getActiveInstance();
    if (newActive) {
      this.opts.onTabSwitch?.(newActive.instanceId);
    }
  }
},
```

#### Fix 2: Close Tab Method Enhancement

**Location**: `src/ts/window-tabs.ts` lines 268-284 (closeTab method)

```typescript
closeTab(instanceId: string): void {
  this.opts.onTabClose?.(instanceId);
  this.manager.destroyInstance(instanceId);

  // After destroying, get the new active instance and trigger onTabSwitch
  // to ensure its content is visible (fixes ghost tab / hidden content issue)
  const remaining = this.manager.getAllInstances();
  if (remaining.length === 0) {
    this.opts.onAllTabsClosed?.();
  } else {
    const newActive = this.manager.getActiveInstance();
    if (newActive) {
      this.opts.onTabSwitch?.(newActive.instanceId);
    }
  }

  this.controller?.refresh();
}
```

## Manual Testing Checklist

### Test 1: Finder Multi-Tab Content Visibility

1. Open Finder (click Finder icon in dock)
2. Create 3 Finder tabs using the "+" button
3. Navigate each tab to different locations (e.g., Tab 1: GitHub, Tab 2: Projects, Tab 3: Desktop)
4. Click on Tab 3 to make it active
5. Click the "×" close button on Tab 3
6. **Expected**: Tab 2 becomes active AND its content is visible
7. **Bug if**: Tab 2 is highlighted but shows empty/wrong content (ghost tab)

### Test 2: Terminal Multi-Tab Content Visibility

1. Open Terminal modal (if available)
2. Create 2 terminal tabs
3. Type different commands in each terminal
4. Close the active tab
5. **Expected**: The remaining tab shows its content immediately
6. **Bug if**: The remaining tab is empty or shows wrong terminal content

### Test 3: Keyboard Shortcuts

Test each of these keyboard shortcuts:

#### Ctrl/Cmd+W (Close Active Tab)

1. Open Finder with 3 tabs
2. Make Tab 2 active
3. Press Ctrl+W (or Cmd+W on Mac)
4. **Expected**: Tab 2 closes, Tab 1 or Tab 3 becomes active with visible content

#### Ctrl/Cmd+N (New Tab)

1. Open Finder
2. Press Ctrl+N (or Cmd+N on Mac)
3. **Expected**: New Finder tab is created and becomes active

#### Ctrl/Cmd+Tab (Next Tab)

1. Open Finder with 3 tabs
2. Make Tab 1 active
3. Press Ctrl+Tab
4. **Expected**: Tab 2 becomes active with visible content

#### Ctrl/Cmd+Shift+Tab (Previous Tab)

1. Open Finder with 3 tabs
2. Make Tab 2 active
3. Press Ctrl+Shift+Tab
4. **Expected**: Tab 1 becomes active with visible content

#### Number Keys 1-9 (Direct Tab Selection)

1. Open Finder with 5 tabs
2. Press "3" key
3. **Expected**: Tab 3 becomes active with visible content

### Test 4: Close All Tabs

1. Open Finder with 3 tabs
2. Close Tab 1 → verify Tab 2 or 3 is active with content
3. Close active tab → verify remaining tab shows content
4. Close last tab
5. **Expected**: Finder modal closes completely

### Test 5: Tab Switching with Mouse

1. Open Finder with 3 tabs
2. Click on different tabs rapidly
3. **Expected**: Each tab click shows correct content immediately
4. **Bug if**: Content doesn't update or shows wrong instance

### Test 6: Middle-Click Close (if supported)

1. Open Finder with 2 tabs
2. Middle-click (mouse wheel click) on a tab
3. **Expected**: Tab closes, remaining tab shows content
4. **Note**: Not all devices support middle-click

## Automated Test Expectations

### tests/e2e/finder-tabs.spec.js

Should pass all 10 tests:

- ✓ Finder opens with initial tab
- ✓ Can create multiple Finder instances via + button
- ✓ Can switch between Finder tabs
- ✓ Can close Finder tab via close button
- ✓ Closing last Finder tab closes the modal
- ✓ Finder tabs have correct title display
- ✓ Finder instances maintain independent navigation state
- ✓ Keyboard shortcut Ctrl+W closes active Finder tab
- ✓ Keyboard shortcut Ctrl+N creates new Finder tab
- ✓ Keyboard shortcut Ctrl+Tab switches to next tab

### tests/e2e/window-tabs.spec.js

Should pass all module loading tests and instance creation tests.

## Build and Type Validation

### Run TypeScript Build

```bash
npm run build:ts
```

**Expected**: No errors, `js/window-tabs.js` is regenerated

### Run Type Check

```bash
npm run typecheck
```

**Expected**: No type errors

### Run Lint

```bash
npm run lint
```

**Expected**: No new linting errors related to window-tabs

## Common Issues and Solutions

### Issue: Tab closes but content doesn't appear

**Cause**: `onTabSwitch` not being called for new active instance
**Fix**: Check that the fix is present in both locations (lines 229-235 and 268-284)

### Issue: Ghost tab appears in UI but no content

**Cause**: UI refresh not synchronized with instance manager state
**Fix**: Verify `controller.refresh()` is called after `destroyInstance`

### Issue: Keyboard shortcuts don't work

**Cause**: MultiInstanceIntegration not properly configured or shortcuts not registered
**Fix**: Check `js/multi-instance-integration.js` and KeyboardShortcuts registration

## Integration Points

### MultiInstanceIntegration

The tab system integrates with `MultiInstanceIntegration` which:

- Calls `onTabSwitch(instanceId)` to show/hide instance content
- Calls `onTabClose(instanceId)` before destroying instances
- Calls `onAllTabsClosed()` when last tab is closed
- Manages keyboard shortcuts for tab operations

### InstanceManager

The tab system expects the manager to:

- Auto-select a new active instance when current is destroyed
- Provide `getActiveInstance()` returning the newly active instance
- Maintain accurate instance count via `getAllInstances().length`

## Verification Checklist

- [ ] TypeScript builds without errors (`npm run build:ts`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Generated `js/window-tabs.js` contains both onTabSwitch fix locations
- [ ] Finder tabs: Close active tab shows new active content
- [ ] Terminal tabs: Close active tab shows new active content
- [ ] All keyboard shortcuts work (W, N, Tab, Shift+Tab, 1-9)
- [ ] Middle-click close works (if device supports it)
- [ ] Closing last tab closes the modal
- [ ] E2E tests pass: `npm run test:e2e -- tests/e2e/finder-tabs.spec.js`
- [ ] E2E tests pass: `npm run test:e2e -- tests/e2e/window-tabs.spec.js`

## Success Criteria

The migration is successful when:

1. **NO direct edits** are made to `js/window-tabs.js` (only edit `src/ts/window-tabs.ts`)
2. **NO ghost tabs** appear after closing a tab
3. **Content is always visible** for the active tab
4. **All keyboard shortcuts** continue to work
5. **All E2E tests** pass (locally and in CI)
6. **TypeScript strict mode** passes with zero errors
