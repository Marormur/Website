/**
 * perf-monitor.ts
 * Performance monitoring and measurement utility for development
 */

console.log('PerfMonitor loaded');

import { getString, setString } from '../services/storage-utils.js';

(() => {
    'use strict';

    const STORAGE_KEY = 'app.perfMonitor.enabled';

    // ===== Types =====

    interface ReportOptions {
        clear?: boolean;
        topN?: number;
    }

    interface CoreWebVitals {
        LCP?: number; // Largest Contentful Paint
        FID?: number; // First Input Delay
        CLS?: number; // Cumulative Layout Shift
        TTFB?: number; // Time to First Byte
    }

    interface PerfMonitorInstance {
        enabled: boolean;
        marks: Set<string>;
        vitals: CoreWebVitals;
        enable(): void;
        disable(): void;
        toggle(): void;
        mark(name: string): void;
        measure(name: string, startMark?: string, endMark?: string): PerformanceMeasure | null;
        report(options?: ReportOptions): PerformanceMeasure[];
        getVitals(): CoreWebVitals;
    }

    // ===== Helper Functions =====

    function isEnabledByDefault(): boolean {
        try {
            // Enable in development environments by default
            const isDev =
                location.hostname === 'localhost' ||
                location.hostname === '127.0.0.1' ||
                location.port !== '';
            const flag = localStorage.getItem(STORAGE_KEY);
            if (flag === 'true') return true;
            if (flag === 'false') return false;
            return isDev;
        } catch (_e) {
            void _e;
            return false;
        }
    }

    // ===== PerfMonitor Instance =====

    const PerfMonitor: PerfMonitorInstance = {
        enabled: isEnabledByDefault(),
        marks: new Set<string>(),
        vitals: {},

        enable() {
            this.enabled = true;
            try {
                setString(STORAGE_KEY, 'true');
            } catch (_e) {
                void _e;
            }
            const logger = (window as typeof window & { Logger?: Console }).Logger || console;
            logger.info('PerfMonitor', 'Enabled');
        },

        disable() {
            this.enabled = false;
            try {
                setString(STORAGE_KEY, 'false');
            } catch (_e) {
                void _e;
            }
            const logger = (window as typeof window & { Logger?: Console }).Logger || console;
            logger.info('PerfMonitor', 'Disabled');
        },

        toggle() {
            if (this.enabled) {
                this.disable();
            } else {
                this.enable();
            }
        },

        mark(name: string) {
            if (!this.enabled || !name) return;
            try {
                performance.mark(name);
                this.marks.add(name);
            } catch (_e) {
                void _e;
            }
        },

        measure(name: string, startMark?: string, endMark?: string): PerformanceMeasure | null {
            if (!this.enabled || !name) return null;
            try {
                if (startMark && endMark) {
                    performance.measure(name, startMark, endMark);
                } else if (startMark) {
                    performance.measure(name, startMark);
                } else {
                    performance.measure(name);
                }
                const entries = performance.getEntriesByName(name, 'measure');
                const lastEntry = entries[entries.length - 1];
                return lastEntry ? (lastEntry as PerformanceMeasure) : null;
            } catch (_e) {
                void _e;
                return null;
            }
        },

        report(options?: ReportOptions): PerformanceMeasure[] {
            if (!this.enabled) return [];
            const { clear = false, topN = 10 } = options || {};
            const measures = performance
                .getEntriesByType('measure')
                .slice()
                .sort((a, b) => b.duration - a.duration)
                .slice(0, topN) as PerformanceMeasure[];

            const logger = (window as typeof window & { Logger?: Console }).Logger || console;
            console.group('PerfMonitor report');

            // Report Core Web Vitals first
            const vitals = this.getVitals();
            if (Object.keys(vitals).length > 0) {
                console.group('Core Web Vitals');
                if (vitals.LCP !== undefined) {
                    console.info(`LCP (Largest Contentful Paint): ${vitals.LCP.toFixed(2)}ms`);
                }
                if (vitals.FID !== undefined) {
                    console.info(`FID (First Input Delay): ${vitals.FID.toFixed(2)}ms`);
                }
                if (vitals.CLS !== undefined) {
                    console.info(`CLS (Cumulative Layout Shift): ${vitals.CLS.toFixed(4)}`);
                }
                if (vitals.TTFB !== undefined) {
                    console.info(`TTFB (Time to First Byte): ${vitals.TTFB.toFixed(2)}ms`);
                }
                console.groupEnd();
            }

            // Report custom measures
            if (measures.length) {
                console.group('Custom Measures');
                for (const m of measures) {
                    console.info(`${m.name}: ${m.duration.toFixed(2)}ms`);
                }
                console.groupEnd();
            }

            console.groupEnd();

            if (clear) {
                performance.clearMeasures();
                try {
                    for (const m of this.marks) performance.clearMarks(m);
                } catch (_e) {
                    void _e;
                }
                this.marks.clear();
            }
            return measures;
        },

        getVitals(): CoreWebVitals {
            return { ...this.vitals };
        },
    };

    // ===== Core Web Vitals Observers =====

    /**
     * Observe Core Web Vitals using PerformanceObserver API
     * These observers are always initialized to capture metrics, even if PerfMonitor is disabled.
     * The metrics will be available via getVitals() when PerfMonitor is later enabled.
     *
     * - LCP: Largest Contentful Paint (< 2.5s good, < 4s needs improvement, >= 4s poor)
     * - FID: First Input Delay (< 100ms good, < 300ms needs improvement, >= 300ms poor)
     * - CLS: Cumulative Layout Shift (< 0.1 good, < 0.25 needs improvement, >= 0.25 poor)
     * - TTFB: Time to First Byte (< 800ms good, < 1800ms needs improvement, >= 1800ms poor)
     */
    try {
        // Observe LCP (Largest Contentful Paint)
        if (
            'PerformanceObserver' in window &&
            PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')
        ) {
            const lcpObserver = new PerformanceObserver(list => {
                const entries = list.getEntries();
                if (entries.length === 0) return;
                const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
                    renderTime?: number;
                    loadTime?: number;
                };
                // LCP is the render time or load time
                PerfMonitor.vitals.LCP =
                    lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime;
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        }

        // Observe FID (First Input Delay)
        if (
            'PerformanceObserver' in window &&
            PerformanceObserver.supportedEntryTypes?.includes('first-input')
        ) {
            const fidObserver = new PerformanceObserver(list => {
                const entries = list.getEntries();
                if (entries.length === 0) return;
                const firstInput = entries[0] as PerformanceEntry & {
                    processingStart?: number;
                };
                // FID is the delay between user input and processing
                if (firstInput && firstInput.processingStart) {
                    PerfMonitor.vitals.FID = firstInput.processingStart - firstInput.startTime;
                }
            });
            fidObserver.observe({ type: 'first-input', buffered: true });
        }

        // Observe CLS (Cumulative Layout Shift)
        if (
            'PerformanceObserver' in window &&
            PerformanceObserver.supportedEntryTypes?.includes('layout-shift')
        ) {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver(list => {
                const entries = list.getEntries();
                if (entries.length === 0) return;
                for (const entry of entries) {
                    const layoutShift = entry as PerformanceEntry & {
                        hadRecentInput?: boolean;
                        value?: number;
                    };
                    // Only count layout shifts without recent user input
                    if (!layoutShift.hadRecentInput && layoutShift.value) {
                        clsValue += layoutShift.value;
                        PerfMonitor.vitals.CLS = clsValue;
                    }
                }
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
        }

        // Observe TTFB (Time to First Byte)
        if (
            'PerformanceObserver' in window &&
            PerformanceObserver.supportedEntryTypes?.includes('navigation')
        ) {
            const ttfbObserver = new PerformanceObserver(list => {
                const entries = list.getEntries();
                if (entries.length === 0) return;
                const navEntry = entries[0] as PerformanceEntry & { responseStart?: number };
                if (navEntry && navEntry.responseStart) {
                    PerfMonitor.vitals.TTFB = navEntry.responseStart;
                }
            });
            ttfbObserver.observe({ type: 'navigation', buffered: true });
        } else {
            // Fallback for browsers without PerformanceObserver for navigation
            // Use PerformanceNavigationTiming API
            const captureTTFB = () => {
                const navTiming = performance.getEntriesByType(
                    'navigation'
                )[0] as PerformanceNavigationTiming;
                if (navTiming && navTiming.responseStart) {
                    PerfMonitor.vitals.TTFB = navTiming.responseStart;
                }
            };

            // Check if page already loaded, otherwise wait for load event
            if (document.readyState === 'complete') {
                captureTTFB();
            } else {
                window.addEventListener('load', captureTTFB, { once: true });
            }
        }
    } catch {
        // Silently fail if PerformanceObserver is not supported
        // This is expected in older browsers
    }

    // ===== Auto Capture Lifecycle Timings =====

    // Auto capture key lifecycle timings
    if (PerfMonitor.enabled) {
        try {
            PerfMonitor.mark('app:js-start');
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                // DOM already parsed
                PerfMonitor.mark('app:dom-ready');
            } else {
                document.addEventListener(
                    'DOMContentLoaded',
                    () => PerfMonitor.mark('app:dom-ready'),
                    { once: true }
                );
            }
            window.addEventListener(
                'load',
                () => {
                    PerfMonitor.mark('app:window-load');
                    PerfMonitor.measure('app:domready->load', 'app:dom-ready', 'app:window-load');
                    PerfMonitor.measure('app:start->load', 'app:js-start', 'app:window-load');
                    PerfMonitor.report({ topN: 5 });
                },
                { once: true }
            );
        } catch (_e) {
            void _e;
        }
    }

    // ===== Global Export =====

    if (typeof window !== 'undefined') {
        (window as typeof window & { PerfMonitor: PerfMonitorInstance }).PerfMonitor = PerfMonitor;
    }
})();

export {};
