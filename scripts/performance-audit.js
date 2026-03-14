#!/usr/bin/env node

/**
 * PURPOSE: Run a lightweight performance audit against the local app without
 * relying on the Lighthouse / LHCI dependency chain.
 * WHY: GitHub security alerts currently stem from Lighthouse transitive
 * dependencies. This script keeps a practical local/CI performance gate using
 * the already-installed Playwright stack and the app's PerfMonitor metrics.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const DEFAULT_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const DEFAULT_RUNS = 3;
const APP_READY_TIMEOUT = Number(process.env.PERF_READY_TIMEOUT_MS || 15000);
const SETTLE_DELAY_MS = Number(process.env.PERF_SETTLE_DELAY_MS || 1200);
const OUTPUT_DIR = path.join(__dirname, '..', 'coverage', 'performance');

const THRESHOLDS = {
    fcp: Number(process.env.PERF_MAX_FCP_MS || 3000),
    lcp: Number(process.env.PERF_MAX_LCP_MS || 4000),
    cls: Number(process.env.PERF_MAX_CLS || 0.1),
    appReady: Number(process.env.PERF_MAX_APP_READY_MS || 5000),
};

function parseMode(argv) {
    const modeArg = argv.find(arg => arg.startsWith('--mode='));
    return modeArg ? modeArg.slice('--mode='.length) : 'audit';
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function round(value, digits = 2) {
    if (typeof value !== 'number' || Number.isNaN(value)) return null;
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function median(values) {
    const numericValues = values.filter(value => typeof value === 'number' && !Number.isNaN(value));
    if (numericValues.length === 0) return null;
    const sorted = [...numericValues].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function average(values) {
    const numericValues = values.filter(value => typeof value === 'number' && !Number.isNaN(value));
    if (numericValues.length === 0) return null;
    return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function formatMetric(value, digits = 2, suffix = 'ms') {
    if (value == null) return 'n/a';
    return `${round(value, digits)}${suffix}`;
}

function evaluateChecks(summary) {
    return [
        {
            name: 'FCP',
            value: summary.fcp,
            max: THRESHOLDS.fcp,
            unit: 'ms',
        },
        {
            name: 'LCP',
            value: summary.lcp,
            max: THRESHOLDS.lcp,
            unit: 'ms',
        },
        {
            name: 'CLS',
            value: summary.cls,
            max: THRESHOLDS.cls,
            unit: '',
        },
        {
            name: 'App ready',
            value: summary.appReady,
            max: THRESHOLDS.appReady,
            unit: 'ms',
        },
    ].map(check => ({
        ...check,
        passed: typeof check.value === 'number' && check.value <= check.max,
    }));
}

async function collectRunMetrics(browser, runIndex) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto(DEFAULT_URL, { waitUntil: 'load' });
        await page.waitForFunction(() => window.__APP_READY === true, {
            timeout: APP_READY_TIMEOUT,
        });
        const appReady = await page.evaluate(() => performance.now());
        await page.waitForTimeout(SETTLE_DELAY_MS);

        const metrics = await page.evaluate(async () => {
            const nextFrame = () =>
                new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));
            const readLastMeasure = name => {
                const entries = performance.getEntriesByName(name, 'measure');
                return entries.length > 0 ? entries[entries.length - 1].duration : null;
            };

            const API = window.API;
            const PerfMonitor = window.PerfMonitor;

            if (API?.window?.open && API?.window?.close) {
                API.window.open('finder-modal');
                await nextFrame();
                API.window.close('finder-modal');
                await nextFrame();
            }

            const initialTheme = API?.theme?.getThemePreference?.() || 'system';
            if (API?.theme?.setThemePreference) {
                API.theme.setThemePreference(initialTheme === 'dark' ? 'light' : 'dark');
                await nextFrame();
                API.theme.setThemePreference(initialTheme);
                await nextFrame();
            }

            if (window.SessionManager?.saveAll) {
                window.SessionManager.saveAll({ immediate: true });
                await sleep(100);
            }

            const paintEntries = performance.getEntriesByType('paint');
            const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
            const navigationEntry = performance.getEntriesByType('navigation')[0] || null;
            const vitals = PerfMonitor?.getVitals?.() || {};

            return {
                fcp: fcpEntry ? fcpEntry.startTime : null,
                lcp: typeof vitals.LCP === 'number' ? vitals.LCP : null,
                cls: typeof vitals.CLS === 'number' ? vitals.CLS : 0,
                ttfb: typeof vitals.TTFB === 'number' ? vitals.TTFB : null,
                domContentLoaded:
                    navigationEntry && typeof navigationEntry.domContentLoadedEventEnd === 'number'
                        ? navigationEntry.domContentLoadedEventEnd
                        : null,
                loadEvent:
                    navigationEntry && typeof navigationEntry.loadEventEnd === 'number'
                        ? navigationEntry.loadEventEnd
                        : null,
                interactions: {
                    windowOpen: readLastMeasure('window:open:finder-modal'),
                    windowClose: readLastMeasure('window:close:finder-modal'),
                    themeChange: readLastMeasure('theme:change-duration'),
                    sessionSave: readLastMeasure('session:save-duration'),
                },
            };
        });

        return {
            run: runIndex,
            url: DEFAULT_URL,
            appReady,
            ...metrics,
        };
    } finally {
        await context.close();
    }
}

function summarizeRuns(runs) {
    return {
        fcp: median(runs.map(run => run.fcp)),
        lcp: median(runs.map(run => run.lcp)),
        cls: median(runs.map(run => run.cls)),
        ttfb: median(runs.map(run => run.ttfb)),
        appReady: median(runs.map(run => run.appReady)),
        domContentLoaded: median(runs.map(run => run.domContentLoaded)),
        loadEvent: median(runs.map(run => run.loadEvent)),
        interactions: {
            windowOpen: average(runs.map(run => run.interactions.windowOpen)),
            windowClose: average(runs.map(run => run.interactions.windowClose)),
            themeChange: average(runs.map(run => run.interactions.themeChange)),
            sessionSave: average(runs.map(run => run.interactions.sessionSave)),
        },
    };
}

function printSummary(mode, runs, summary, checks) {
    console.log(`\nPerformance audit (${mode}) for ${DEFAULT_URL}`);
    console.log(`Runs: ${runs.length}`);
    console.log('');
    console.log(`FCP:        ${formatMetric(summary.fcp)}`);
    console.log(`LCP:        ${formatMetric(summary.lcp)}`);
    console.log(`CLS:        ${summary.cls == null ? 'n/a' : round(summary.cls, 4)}`);
    console.log(`TTFB:       ${formatMetric(summary.ttfb)}`);
    console.log(`App ready:  ${formatMetric(summary.appReady)}`);
    console.log(`DOMContent: ${formatMetric(summary.domContentLoaded)}`);
    console.log(`Load:       ${formatMetric(summary.loadEvent)}`);
    console.log('');
    console.log('Interaction averages:');
    console.log(`  open finder: ${formatMetric(summary.interactions.windowOpen)}`);
    console.log(`  close finder: ${formatMetric(summary.interactions.windowClose)}`);
    console.log(`  theme change: ${formatMetric(summary.interactions.themeChange)}`);
    console.log(`  session save: ${formatMetric(summary.interactions.sessionSave)}`);
    console.log('');
    console.log('Threshold checks:');
    for (const check of checks) {
        const value =
            check.unit === 'ms'
                ? formatMetric(check.value)
                : check.value == null
                  ? 'n/a'
                  : round(check.value, 4);
        const limit = check.unit === 'ms' ? formatMetric(check.max) : check.max;
        console.log(`  ${check.passed ? 'PASS' : 'FAIL'} ${check.name}: ${value} <= ${limit}`);
    }
}

function writeReport(mode, runs, summary, checks) {
    ensureDir(OUTPUT_DIR);
    const report = {
        generatedAt: new Date().toISOString(),
        mode,
        url: DEFAULT_URL,
        thresholds: THRESHOLDS,
        runs: runs.map(run => ({
            ...run,
            appReady: round(run.appReady),
            fcp: round(run.fcp),
            lcp: round(run.lcp),
            cls: round(run.cls, 4),
            ttfb: round(run.ttfb),
            domContentLoaded: round(run.domContentLoaded),
            loadEvent: round(run.loadEvent),
            interactions: {
                windowOpen: round(run.interactions.windowOpen),
                windowClose: round(run.interactions.windowClose),
                themeChange: round(run.interactions.themeChange),
                sessionSave: round(run.interactions.sessionSave),
            },
        })),
        summary: {
            fcp: round(summary.fcp),
            lcp: round(summary.lcp),
            cls: round(summary.cls, 4),
            ttfb: round(summary.ttfb),
            appReady: round(summary.appReady),
            domContentLoaded: round(summary.domContentLoaded),
            loadEvent: round(summary.loadEvent),
            interactions: {
                windowOpen: round(summary.interactions.windowOpen),
                windowClose: round(summary.interactions.windowClose),
                themeChange: round(summary.interactions.themeChange),
                sessionSave: round(summary.interactions.sessionSave),
            },
        },
        checks,
    };

    const outFile = path.join(OUTPUT_DIR, `latest-${mode}.json`);
    fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`\nReport written to ${path.relative(path.join(__dirname, '..'), outFile)}`);
    return outFile;
}

async function main() {
    const mode = parseMode(process.argv.slice(2));
    const runCount = mode === 'ci' ? DEFAULT_RUNS : 1;
    const browser = await chromium.launch({ headless: true });

    try {
        const runs = [];
        for (let index = 0; index < runCount; index += 1) {
            runs.push(await collectRunMetrics(browser, index + 1));
        }

        const summary = summarizeRuns(runs);
        const checks = evaluateChecks(summary);
        writeReport(mode, runs, summary, checks);
        printSummary(mode, runs, summary, checks);

        if (mode === 'report') {
            return;
        }

        if (checks.some(check => !check.passed)) {
            process.exitCode = 1;
        }
    } finally {
        await browser.close();
    }
}

main().catch(error => {
    console.error('Performance audit failed:', error);
    process.exitCode = 1;
});
