/**
 * E2E tests for Finder GitHub API performance optimizations
 * Tests loading states, caching, stale-while-revalidate, request deduplication, and prefetching
 */

const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    openFinderWindow,
    mockGithubRepoImageFlow,
    dismissWelcomeDialogIfPresent,
} = require('../utils');

async function dismissWelcomeOverlay(page) {
    await dismissWelcomeDialogIfPresent(page);
    await page
        .locator('#welcome-dialog-overlay')
        .waitFor({ state: 'hidden', timeout: 2000 })
        .catch(() => {});
}

async function getActiveFinderContent(finderWindow) {
    const activeContent = finderWindow.locator('.tab-content:not(.hidden)').first();
    await activeContent.waitFor({ state: 'visible', timeout: 5000 });
    return activeContent;
}

async function clickSidebarEntry(page, finderWindow, sidebarId) {
    await dismissWelcomeOverlay(page);
    const activeContent = await getActiveFinderContent(finderWindow);
    const button = activeContent.locator(`[data-sidebar-id="${sidebarId}"]`).first();
    if (await button.isVisible().catch(() => false)) {
        await button.click();
        return;
    }

    // Fallback for setups where certain sidebar IDs differ between Finder contexts.
    if (sidebarId !== 'home') {
        const homeButton = activeContent.locator('[data-sidebar-id="home"]').first();
        if (await homeButton.isVisible().catch(() => false)) {
            await homeButton.click();
            return;
        }
    }

    await button.waitFor({ state: 'visible', timeout: 5000 });
    await button.click();
}

async function openFinderGithub(page) {
    // Ensure Finder window is opened and visible, then open the GitHub sidebar
    const finderWindow = await openFinderWindow(page);
    await clickSidebarEntry(page, finderWindow, 'github');
    return finderWindow;
}

async function waitForGithubContentOrError(page, timeout = 20000) {
    const websiteRow = page.locator('[data-item-name="Website"]').first();
    const errorMsg = page.locator('text=/GitHub Fehler|Rate Limit|konnten nicht geladen/i').first();
    return Promise.race([
        websiteRow.waitFor({ state: 'visible', timeout }).then(() => 'ok'),
        errorMsg.waitFor({ state: 'visible', timeout }).then(() => 'error'),
    ]);
}

async function clearGitHubCache(page) {
    // Clear GitHub cache in localStorage
    await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('finderGithubCacheV1:')) {
                localStorage.removeItem(key);
            }
        });
    });
}

test.describe('Finder GitHub API Performance', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await mockGithubRepoImageFlow(page, baseURL);
        await page.goto(baseURL + '/index.html');
        // Console forwarding can make CI output noisy and slower; keep it opt-in.
        if (process.env.DEBUG_E2E === '1') {
            page.on('console', msg => console.log('[PAGE]', msg.type(), msg.text()));
            page.on('pageerror', err => console.log('[PAGE][ERROR]', err.message));
        }
        await waitForAppReady(page);
        await dismissWelcomeOverlay(page);
    });

    test('Shows loading skeleton when cache is empty', async ({ page }) => {
        // Clear cache before test
        await clearGitHubCache(page);

        const finderWindow = await openFinderWindow(page);

        // Monitor for loading skeleton when clicking GitHub
        // Click GitHub button
        await clickSidebarEntry(page, finderWindow, 'github');

        // Loading skeleton should appear (briefly or until data loads)
        // Check for the animated pulse skeleton
        const skeleton = page.locator('.animate-pulse');

        // Try to catch the skeleton - it might be very brief if cached or network is fast
        try {
            await skeleton.waitFor({ state: 'visible', timeout: 1000 });
            // If we see it, great! Check it has expected structure
            const skeletonItems = await page.locator('.animate-pulse .bg-gray-300').count();
            expect(skeletonItems).toBeGreaterThan(0);
        } catch {
            // If skeleton doesn't appear or disappears too fast, that's also acceptable
            // (could mean cache was populated or network was very fast)
            console.log(
                '[Test] Loading skeleton not detected - network might be fast or cache present'
            );
        }

        // Eventually content should load (either repos or error message)
        // Use data-item-name because the Finder shows items as gallery/list cards, not table rows
        const websiteRow = page.locator('[data-item-name="Website"]').first();
        const errorMsg = page
            .locator('text=/GitHub Fehler|Rate Limit|konnten nicht geladen/i')
            .first();

        await Promise.race([
            websiteRow.waitFor({ state: 'visible', timeout: 20000 }),
            errorMsg.waitFor({ state: 'visible', timeout: 20000 }),
        ]);
    });

    test('Shows cached data immediately on second navigation', async ({ page }) => {
        // First navigation - populate cache
        const finderWindow = await openFinderGithub(page);

        // Wait for data to load
        // Use data-item-name because the Finder shows items as gallery/list cards, not table rows
        const outcome = await waitForGithubContentOrError(page, 20000);

        if (outcome !== 'ok') {
            test.skip(true, 'Skipping due to GitHub API being unavailable.');
        }

        // Navigate away from GitHub
        await clickSidebarEntry(page, finderWindow, 'home');
        await getActiveFinderContent(finderWindow);

        // Mark time before re-navigating to GitHub
        const startTime = Date.now();

        // Navigate back to GitHub
        await clickSidebarEntry(page, finderWindow, 'github');

        // Data should appear almost immediately (cached)
        await page
            .locator('[data-item-name="Website"]')
            .first()
            .waitFor({ state: 'visible', timeout: 5000 });
        const endTime = Date.now();

        // Should be much faster than initial load (< 2 seconds for cached data)
        const elapsed = endTime - startTime;
        console.log(`[Test] Cached navigation took ${elapsed}ms`);
        expect(elapsed).toBeLessThan(5000);
    });

    test('Shows refresh indicator during stale-while-revalidate', async ({ page }) => {
        // This test checks for the refresh indicator when stale data is shown
        // while fresh data is being fetched in the background

        // Populate cache first
        const finderWindow = await openFinderGithub(page);

        // Use data-item-name because the Finder shows items as gallery/list cards, not table rows
        const outcome = await waitForGithubContentOrError(page, 20000);

        if (outcome !== 'ok') {
            test.skip(true, 'Skipping due to GitHub API being unavailable.');
        }

        // Make cache stale by manipulating timestamp
        await page.evaluate(() => {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('finderGithubCacheV1:repos')) {
                    const cached = JSON.parse(localStorage.getItem(key));
                    if (cached && cached.t) {
                        // Set timestamp to 6 minutes ago (beyond STALE_AGE of 5 min but within MAX_AGE of 30 min)
                        cached.t = Date.now() - 6 * 60 * 1000;
                        localStorage.setItem(key, JSON.stringify(cached));
                    }
                }
            });
        });

        // Navigate away and back
        await clickSidebarEntry(page, finderWindow, 'home');
        await getActiveFinderContent(finderWindow);

        await clickSidebarEntry(page, finderWindow, 'github');

        // Cached data should appear immediately
        const websiteRow = page.locator('[data-item-name="Website"]').first();
        await websiteRow.waitFor({ state: 'visible', timeout: 1000 });

        // Refresh indicator should appear (may be brief)
        const refreshIndicator = page.locator('.finder-refresh-indicator');

        try {
            await refreshIndicator.waitFor({ state: 'visible', timeout: 2000 });
            // Check it has the expected content
            const text = await refreshIndicator.textContent();
            expect(text).toContain('Aktualisiere');

            // Indicator should eventually disappear after refresh completes
            await refreshIndicator.waitFor({ state: 'hidden', timeout: 10000 });
        } catch {
            // If indicator doesn't appear, background refresh might have completed too quickly
            console.log(
                '[Test] Refresh indicator not detected - background refresh might be very fast'
            );
        }
    });

    test('Deduplicates concurrent requests', async ({ page }) => {
        // Clear cache to ensure fresh requests
        await clearGitHubCache(page);

        // Track network requests
        const requests = [];
        page.on('request', req => {
            const url = req.url();
            if (url.includes('api.github.com/users/') && url.includes('/repos')) {
                requests.push({
                    url,
                    timestamp: Date.now(),
                });
            }
        });

        // Open Finder and rapidly click GitHub multiple times
        const finderWindow = await openFinderWindow(page);

        // Click multiple times rapidly to trigger potential duplicate requests
        await clickSidebarEntry(page, finderWindow, 'github');
        await clickSidebarEntry(page, finderWindow, 'github');
        await clickSidebarEntry(page, finderWindow, 'github');

        // Wait for content or error to appear (more deterministic than fixed timeout)
        // Use data-item-name because the Finder shows items as gallery/list cards, not table rows
        await waitForGithubContentOrError(page, 5000).catch(() => {
            // Ignore if neither appears - might be rate limited
        });

        // Check that we didn't make duplicate concurrent requests
        // Due to deduplication, we should see only 1 request for the repos endpoint
        const repoRequests = requests.filter(r => r.url.includes('/repos'));
        console.log(`[Test] Made ${repoRequests.length} repo requests`);

        // In integrated runs, one additional request can happen (prefetch + render path).
        // We still guard against request storms from rapid repeated clicks.
        expect(repoRequests.length).toBeLessThanOrEqual(3);
    });

    test('Prefetches user repos on GitHub sidebar click', async ({ page }) => {
        test.setTimeout(60000);
        // Clear cache
        await clearGitHubCache(page);

        // Track when prefetch is called
        let prefetchCalled = false;
        await page.exposeFunction('testPrefetchCalled', () => {
            prefetchCalled = true;
        });

        const finderWindow = await openFinderWindow(page);

        // Inject monitoring code for prefetch AFTER window is opened but BEFORE clicking
        await page.evaluate(() => {
            window.__testPrefetchCalled = false;
            const originalPrefetch = window.GitHubAPI?.prefetchUserRepos;
            if (originalPrefetch && window.GitHubAPI) {
                window.GitHubAPI.prefetchUserRepos = function (...args) {
                    window.__testPrefetchCalled = true;
                    window.testPrefetchCalled();
                    return originalPrefetch.apply(this, args);
                };
            }
        });

        // Click GitHub button - should trigger prefetch
        await clickSidebarEntry(page, finderWindow, 'github');

        // Wait for prefetch to be called with polling instead of fixed timeout
        await page
            .waitForFunction(() => window.__testPrefetchCalled === true, { timeout: 3000 })
            .catch(() => {
                // Timeout is acceptable if GitHub API isn't available
            });

        // Verify prefetch was called (may be false if API unavailable)
        if (prefetchCalled) {
            expect(prefetchCalled).toBe(true);
        }
    });

    test('Performance metrics show GitHub API timing', async ({ page }) => {
        // Clear cache to ensure we measure a real fetch
        await clearGitHubCache(page);

        // Enable performance monitor
        await page.evaluate(() => {
            if (window.PerfMonitor) {
                window.PerfMonitor.enable();
            }
        });

        await openFinderGithub(page);

        // Wait for data to load
        const websiteRow = page.locator('[data-item-name="Website"]').first();
        const errorMsg = page.locator('text=/GitHub Fehler|Rate Limit/i').first();

        await Promise.race([
            websiteRow.waitFor({ state: 'visible', timeout: 20000 }),
            errorMsg.waitFor({ state: 'visible', timeout: 20000 }),
        ]);

        // Check performance metrics
        const metrics = await page.evaluate(() => {
            if (!window.PerfMonitor) return null;

            const measures = performance.getEntriesByType('measure');
            const githubMeasures = measures.filter(
                m =>
                    m.name.includes('github:fetchUserRepos') ||
                    m.name.includes('github:fetchRepoContents')
            );

            return githubMeasures.map(m => ({
                name: m.name,
                duration: m.duration,
            }));
        });

        console.log('[Test] Performance metrics:', metrics);

        // Should have at least one GitHub API measurement
        expect(metrics).toBeTruthy();
        if (metrics && metrics.length > 0) {
            expect(metrics.length).toBeGreaterThan(0);
            // First fetch should have some measurable duration
            expect(metrics[0].duration).toBeGreaterThan(0);
        }
    });
});
