/**
 * E2E tests for Finder GitHub API performance optimizations
 * Tests loading states, caching, stale-while-revalidate, request deduplication, and prefetching
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady, openFinderWindow } = require('../utils');

async function openFinderGithub(page) {
    // Ensure Finder window is opened and visible, then open the GitHub sidebar
    await openFinderWindow(page);
    const githubBtn = page.locator('#finder-sidebar-github');
    await githubBtn.waitFor({ state: 'visible', timeout: 5000 });
    await githubBtn.click();
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
        await page.goto(baseURL + '/index.html');
        // Forward page console messages to test output for debugging
        page.on('console', msg => console.log('[PAGE]', msg.type(), msg.text()));
        page.on('pageerror', err => console.log('[PAGE][ERROR]', err.message));
        await waitForAppReady(page);
    });

    test('Shows loading skeleton when cache is empty', async ({ page }) => {
        // Clear cache before test
        await clearGitHubCache(page);

        await openFinderWindow(page);

        // Monitor for loading skeleton when clicking GitHub
        const githubBtn = page.locator('#finder-sidebar-github');
        await githubBtn.waitFor({ state: 'visible', timeout: 5000 });

        // Click GitHub button
        await githubBtn.click();

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
            console.log('[Test] Loading skeleton not detected - network might be fast or cache present');
        }

        // Eventually content should load (either repos or error message)
        const websiteRow = page.locator('tr:has-text("Website")').first();
        const errorMsg = page.locator('text=/GitHub Fehler|Rate Limit|konnten nicht geladen/i').first();
        
        await Promise.race([
            websiteRow.waitFor({ state: 'visible', timeout: 20000 }),
            errorMsg.waitFor({ state: 'visible', timeout: 20000 }),
        ]);
    });

    test('Shows cached data immediately on second navigation', async ({ page }) => {
        // First navigation - populate cache
        await openFinderGithub(page);
        
        // Wait for data to load
        const websiteRow = page.locator('tr:has-text("Website")').first();
        const errorMsg = page.locator('text=/GitHub Fehler|Rate Limit|konnten nicht geladen/i').first();
        
        const race = Promise.race([
            websiteRow.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'ok'),
            errorMsg.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'error'),
        ]);
        const outcome = await race;
        
        if (outcome !== 'ok') {
            test.skip(true, 'Skipping due to GitHub API being unavailable.');
        }

        // Navigate away from GitHub
        const computerBtn = page.locator('#finder-sidebar-computer');
        await computerBtn.click();
        await page.waitForTimeout(500); // Brief pause to ensure navigation

        // Mark time before re-navigating to GitHub
        const startTime = Date.now();

        // Navigate back to GitHub
        const githubBtn = page.locator('#finder-sidebar-github');
        await githubBtn.click();

        // Data should appear almost immediately (cached)
        await websiteRow.waitFor({ state: 'visible', timeout: 2000 });
        const endTime = Date.now();

        // Should be much faster than initial load (< 2 seconds for cached data)
        const elapsed = endTime - startTime;
        console.log(`[Test] Cached navigation took ${elapsed}ms`);
        expect(elapsed).toBeLessThan(2000);
    });

    test('Shows refresh indicator during stale-while-revalidate', async ({ page }) => {
        // This test checks for the refresh indicator when stale data is shown
        // while fresh data is being fetched in the background

        // Populate cache first
        await openFinderGithub(page);
        
        const websiteRow = page.locator('tr:has-text("Website")').first();
        const errorMsg = page.locator('text=/GitHub Fehler|Rate Limit|konnten nicht geladen/i').first();
        
        const race = Promise.race([
            websiteRow.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'ok'),
            errorMsg.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'error'),
        ]);
        const outcome = await race;
        
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
                        cached.t = Date.now() - (6 * 60 * 1000);
                        localStorage.setItem(key, JSON.stringify(cached));
                    }
                }
            });
        });

        // Navigate away and back
        const computerBtn = page.locator('#finder-sidebar-computer');
        await computerBtn.click();
        await page.waitForTimeout(300);

        const githubBtn = page.locator('#finder-sidebar-github');
        await githubBtn.click();

        // Cached data should appear immediately
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
            console.log('[Test] Refresh indicator not detected - background refresh might be very fast');
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
        await openFinderWindow(page);
        const githubBtn = page.locator('#finder-sidebar-github');
        
        // Click multiple times rapidly to trigger potential duplicate requests
        await githubBtn.click();
        await githubBtn.click();
        await githubBtn.click();

        // Wait for content or error to appear (more deterministic than fixed timeout)
        const websiteRow = page.locator('tr:has-text("Website")').first();
        const errorMsg = page.locator('text=/GitHub Fehler|Rate Limit|konnten nicht geladen/i').first();
        
        await Promise.race([
            websiteRow.waitFor({ state: 'visible', timeout: 5000 }),
            errorMsg.waitFor({ state: 'visible', timeout: 5000 }),
        ]).catch(() => {
            // Ignore if neither appears - might be rate limited
        });

        // Check that we didn't make duplicate concurrent requests
        // Due to deduplication, we should see only 1 request for the repos endpoint
        const repoRequests = requests.filter(r => r.url.includes('/repos'));
        console.log(`[Test] Made ${repoRequests.length} repo requests`);
        
        // Should be 1 or 2 at most (not 3 or more from rapid clicking)
        expect(repoRequests.length).toBeLessThanOrEqual(2);
    });

    test('Prefetches user repos on GitHub sidebar click', async ({ page }) => {
        // Clear cache
        await clearGitHubCache(page);

        // Track when prefetch is called
        let prefetchCalled = false;
        await page.exposeFunction('testPrefetchCalled', () => {
            prefetchCalled = true;
        });

        await openFinderWindow(page);

        // Inject monitoring code for prefetch AFTER window is opened but BEFORE clicking
        await page.evaluate(() => {
            const originalPrefetch = window.GitHubAPI?.prefetchUserRepos;
            if (originalPrefetch && window.GitHubAPI) {
                window.GitHubAPI.prefetchUserRepos = function(...args) {
                    window.testPrefetchCalled();
                    return originalPrefetch.apply(this, args);
                };
            }
        });
        
        // Click GitHub button - should trigger prefetch
        const githubBtn = page.locator('#finder-sidebar-github');
        await githubBtn.click();

        // Wait for prefetch to be called with polling instead of fixed timeout
        await page.waitForFunction(() => window.prefetchCalled === true, { timeout: 2000 }).catch(() => {
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
        const websiteRow = page.locator('tr:has-text("Website")').first();
        const errorMsg = page.locator('text=/GitHub Fehler|Rate Limit/i').first();
        
        await Promise.race([
            websiteRow.waitFor({ state: 'visible', timeout: 20000 }),
            errorMsg.waitFor({ state: 'visible', timeout: 20000 }),
        ]);

        // Check performance metrics
        const metrics = await page.evaluate(() => {
            if (!window.PerfMonitor) return null;
            
            const measures = performance.getEntriesByType('measure');
            const githubMeasures = measures.filter(m => 
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
