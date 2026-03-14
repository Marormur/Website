# Playwright Failing Tests Overview

Stand: 2026-03-14
Quelle: npm run test:e2e (Headless, Chromium)

Ziel: Kompakte Arbeitsliste fuer die schrittweise Re-Evaluierung (Codefehler vs. Test-Anpassungsbedarf).

## Fehlgeschlagene Tests (58)

- [ ] tests/e2e/apps/finder-vdom-tabs.spec.js:16:9 › Finder VDOM Tabs › should render VDOM tabs inside the content area - Error: expect(locator).toBeVisible() failed
- [ ] tests/e2e/finder-sidebar-collapse.spec.js:136:5 › Finder Sidebar - Collapsible Groups › should persist collapse state during tab navigation - TimeoutError: page.waitForSelector: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder-sidebar-collapse.spec.js:167:5 › Finder Sidebar - Collapsible Groups › should show and hide toggle on focus within group header - TimeoutError: page.waitForSelector: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder-sidebar-collapse.spec.js:18:5 › Finder Sidebar - Collapsible Groups › should show toggle arrow on hover over group header - TimeoutError: page.waitForSelector: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder-sidebar-collapse.spec.js:188:5 › Finder Sidebar - Collapsible Groups › should have correct accessibility attributes - TimeoutError: page.waitForSelector: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder-sidebar-collapse.spec.js:38:5 › Finder Sidebar - Collapsible Groups › should collapse group when clicking toggle button - TimeoutError: page.waitForSelector: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder-sidebar-collapse.spec.js:61:5 › Finder Sidebar - Collapsible Groups › should expand group when clicking toggle button again - TimeoutError: page.waitForSelector: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder-sidebar-collapse.spec.js:88:5 › Finder Sidebar - Collapsible Groups › should handle multiple groups independently - TimeoutError: page.waitForSelector: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-github-performance.spec.js:190:5 › Finder GitHub API Performance › Deduplicates concurrent requests - Error: expect(received).toBeLessThanOrEqual(expected)
- [ ] tests/e2e/finder/finder-github.spec.js:36:5 › Finder GitHub integration › Clicking GitHub in Finder does not open Projects window - TimeoutError: locator.waitFor: Timeout 20000ms exceeded.
- [ ] tests/e2e/finder/finder-github.spec.js:56:5 › Finder GitHub integration › Open Website/img/wallpaper.png in image viewer - TimeoutError: page.waitForFunction: Timeout 10000ms exceeded.
- [ ] tests/e2e/finder/finder-new-features.spec.js:113:9 › FinderView New Features › Sort UI: Change sort order - TimeoutError: locator.click: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-new-features.spec.js:170:9 › FinderView New Features › Navigation: Updates breadcrumbs correctly - Error: expect(locator).toBeVisible() failed
- [ ] tests/e2e/finder/finder-new-features.spec.js:205:9 › FinderView New Features › View Modes: Switch between list and grid - Error: expect(locator).toBeVisible() failed
- [ ] tests/e2e/finder/finder-new-features.spec.js:252:9 › FinderView New Features › State Persistence: Remembers view mode and sort settings - TimeoutError: locator.click: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-new-features.spec.js:93:9 › FinderView New Features › Sort UI: Toggle sort menu - Error: expect(locator).toBeVisible() failed
- [ ] tests/e2e/finder/finder-reopen-after-close-all.spec.js:65:5 › Finder reopen after closing all tabs › Reopen renders fresh content and tab - TimeoutError: locator.click: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-tab-titles.spec.js:42:5 › Finder tab titles show folder names › tab title shows current folder name instead of "Finder <number>" - Error: expect(received).toBe(expected) // Object.is equality
- [ ] tests/e2e/finder/finder-tabs-ghost-fix.spec.js:115:5 › Finder Tabs - Ghost Tab Fix › Re-clicking tabs after closing middle does not show missing tabs - TimeoutError: locator.click: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-tabs-ghost-fix.spec.js:162:5 › Finder Tabs - Ghost Tab Fix › Drag to reorder tabs - TimeoutError: locator.dragTo: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-tabs-ghost-fix.spec.js:17:5 › Finder Tabs - Ghost Tab Fix › Closing middle tab removes it from DOM (no ghost tabs) - TimeoutError: page.waitForFunction: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-tabs-ghost-fix.spec.js:217:5 › Finder Tabs - Ghost Tab Fix › Keyboard shortcuts work after middle tab close - TimeoutError: page.waitForFunction: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-tabs-ghost-fix.spec.js:330:5 › Finder Tabs - Ghost Tab Fix › Active tab is reassigned after closing active tab - TimeoutError: locator.click: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-tabs-ghost-fix.spec.js:67:5 › Finder Tabs - Ghost Tab Fix › Closing last remaining tab closes modal - TimeoutError: locator.click: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-tabs-ghost-fix.spec.js:81:5 › Finder Tabs - Ghost Tab Fix › Closing first tab removes it and updates active - TimeoutError: locator.click: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-tabs.spec.js:169:5 › Finder Multi-Instance Tabs › Closing last Finder tab closes the modal - TimeoutError: locator.click: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-tabs.spec.js:210:5 › Finder Multi-Instance Tabs › Finder instances maintain independent navigation state - Error: expect(received).toBe(expected) // Object.is equality
- [ ] tests/e2e/finder/finder-tabs.spec.js:297:5 › Finder Multi-Instance Tabs › API-based tab switching (replaces Ctrl+Tab) - TimeoutError: locator.click: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-tabs.spec.js:327:5 › Finder Multi-Instance Tabs › Can reorder Finder tabs via drag and drop - TimeoutError: locator.dragTo: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-view-dblclick.spec.js:24:5 › FinderView Double-Click Navigation @basic › should navigate into folder on double-click in list view - TimeoutError: locator.waitFor: Timeout 6000ms exceeded.
- [ ] tests/e2e/finder/finder-view-dblclick.spec.js:58:5 › FinderView Double-Click Navigation @basic › should navigate into folder on double-click in grid view - TimeoutError: locator.waitFor: Timeout 6000ms exceeded.
- [ ] tests/e2e/finder/finder-view-dblclick.spec.js:88:5 › FinderView Double-Click Navigation @basic › should not break DOM on single-click (no re-render issue) - TimeoutError: locator.waitFor: Timeout 6000ms exceeded.
- [ ] tests/e2e/finder/finder-visibility-layout.spec.js:125:5 › Finder visibility and full-width layout › after reload and session restore, only one instance is visible - Error: expect(received).toBe(expected) // Object.is equality
- [ ] tests/e2e/finder/finder-visibility-layout.spec.js:66:5 › Finder visibility and full-width layout › only one instance is visible when multiple tabs exist - Error: expect(received).toBeGreaterThanOrEqual(expected)
- [ ] tests/e2e/integration/perf-monitor.spec.js:210:9 › Performance Monitor Integration @basic › should include vitals in report output - Error: expect(received).toBe(expected) // Object.is equality
- [ ] tests/e2e/performance/perf-monitor-stats.spec.js:118:5 › PerfMonitor Statistics @basic › should support reportStats() with console.table - Error: expect(received).toBeGreaterThan(expected)
- [ ] tests/e2e/performance/perf-monitor-stats.spec.js:44:5 › PerfMonitor Statistics @basic › should track metrics across multiple calls - Error: expect(received).toBeGreaterThan(expected)
- [ ] tests/e2e/performance/vdom-performance.spec.js:241:5 › VDOM Performance - FinderView @basic › FinderView: Selection preservation during updates - Error: expect(received).toBe(expected) // Object.is equality
- [ ] tests/e2e/performance/vdom-performance.spec.js:395:5 › VDOM Performance - TextEditor › TextEditor: Toolbar updates < 20ms - TimeoutError: locator.click: Timeout 25000ms exceeded.
- [ ] tests/e2e/performance/vdom-performance.spec.js:419:5 › VDOM Performance - TextEditor › TextEditor: Editor focus preservation - TimeoutError: locator.click: Timeout 25000ms exceeded.
- [ ] tests/e2e/photos/photos-app.spec.js:25:5 › Photos App › Photos App modal structure exists - Error: expect(locator).toHaveCount(expected) failed
- [ ] tests/e2e/photos/photos-app.spec.js:31:5 › Photos App › Photos App can be opened from Launchpad - Error: expect(locator).toHaveClass(expected) failed
- [ ] tests/e2e/session/session-restore-full.spec.js:332:5 › Session Restore - Full Integration @basic › should handle missing modal elements gracefully - Error: expect(received).toBe(expected) // Object.is equality
- [ ] tests/e2e/session/session-restore-performance.spec.js:296:9 › Session Restore Performance › should batch restore instances by type in parallel - Error: expect(received).toBe(expected) // Object.is equality
- [ ] tests/e2e/terminal/terminal-session-persistence.spec.js:253:5 › Terminal Session Persistence › window positions persist - Error: expect(received).not.toBeNull()
- [ ] tests/e2e/text-editor/text-editor-tabs.spec.js:104:5 › Text Editor Multi-Instance Tabs › Can reorder Text Editor tabs via drag and drop - Error: expect(locator).toHaveCount(expected) failed
- [ ] tests/e2e/ui/i18n-apple-menu-labels.spec.js:20:1 › Apple menu labels update when toggling language - TimeoutError: locator.check: Timeout 25000ms exceeded.
- [ ] tests/e2e/ui/i18n-settings-system-toggle.spec.js:20:1 › Language settings: switch to German, back to System (en-US) - Error: expect(locator).toHaveText(expected) failed
- [ ] tests/e2e/ui/menubar.spec.js:21:5 › Menubar switches with active window (de-DE) › Finder menus appear when Finder is active - Error: expect(locator).toBeVisible() failed
- [ ] tests/e2e/ui/menubar.spec.js:42:5 › Menubar switches with active window (de-DE) › Switch to Texteditor and back to Finder updates menubar - Error: expect(locator).toBeVisible() failed
- [ ] tests/e2e/windows/window-menu-multi-instance.spec.js:104:5 › Window Menu Multi-Instance Integration › Can switch Finder instances via Window menu - Error: expect(locator).toBeVisible() failed
- [ ] tests/e2e/windows/window-menu-multi-instance.spec.js:145:5 › Window Menu Multi-Instance Integration › Window menu shows "Close All" action with multiple instances - Error: expect(locator).toBeVisible() failed
- [ ] tests/e2e/windows/window-menu-multi-instance.spec.js:160:5 › Window Menu Multi-Instance Integration › Close All action closes all Finder instances - Error: expect(locator).toBeVisible() failed
- [ ] tests/e2e/windows/window-menu-multi-instance.spec.js:192:5 › Window Menu Multi-Instance Integration › New Finder action creates new instance - Error: expect(locator).toBeVisible() failed
- [ ] tests/e2e/windows/window-menu-multi-instance.spec.js:211:5 › Window Menu Multi-Instance Integration › Menu updates when instances are created/destroyed - Error: expect(locator).toBeVisible() failed
- [ ] tests/e2e/windows/window-menu-multi-instance.spec.js:46:5 › Window Menu Multi-Instance Integration › @basic Window menu shows Finder instances and actions - Error: expect(locator).toBeVisible() failed
- [ ] tests/e2e/windows/window-menu-multi-instance.spec.js:66:5 › Window Menu Multi-Instance Integration › Window menu lists multiple Finder instances - Error: expect(locator).toBeVisible() failed
- [ ] tests/e2e/windows/window-menu-multi-instance.spec.js:89:5 › Window Menu Multi-Instance Integration › Window menu shows checkmark on active instance - Error: expect(locator).toBeVisible() failed

## Flaky Tests (9)

Diese Tests sind im Retry gruen geworden und sind separat zur Stabilitaets-Nacharbeit gelistet.

- [ ] tests/e2e/finder/finder-github-performance.spec.js:277:5 › Finder GitHub API Performance › Performance metrics show GitHub API timing - TimeoutError: locator.click: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-tabs-ghost-fix.spec.js:275:5 › Finder Tabs - Ghost Tab Fix › No "Instance not found" warnings after close - TimeoutError: locator.click: Timeout 25000ms exceeded.
- [ ] tests/e2e/finder/finder-tabs.spec.js:65:5 › Finder Multi-Instance Tabs › Can switch between Finder tabs - TimeoutError: locator.click: Timeout 25000ms exceeded.
- [ ] tests/e2e/session/session-restore-performance.spec.js:140:9 › Session Restore Performance › should handle 30 instances without timeout - Error: expect(received).toBe(expected) // Object.is equality
- [ ] tests/e2e/session/session-restore-performance.spec.js:254:9 › Session Restore Performance › should restore active instance selection with many instances - Error: expect(received).toBe(expected) // Object.is equality
- [ ] tests/e2e/text-editor/text-editor-tabs.spec.js:28:5 › Text Editor Multi-Instance Tabs › Text Editor opens with initial tab - Error: expect(locator).toHaveCount(expected) failed
- [ ] tests/e2e/text-editor/text-editor-tabs.spec.js:44:5 › Text Editor Multi-Instance Tabs › Can create and switch between Text Editor tabs - Error: expect(locator).toHaveCount(expected) failed
- [ ] tests/e2e/text-editor/text-editor-tabs.spec.js:68:5 › Text Editor Multi-Instance Tabs › Close button removes a Text Editor tab - Error: expect(locator).toHaveCount(expected) failed
- [ ] tests/e2e/text-editor/text-editor-tabs.spec.js:83:5 › Text Editor Multi-Instance Tabs › Can switch tabs via app API - Error: expect(locator).toHaveCount(expected) failed
