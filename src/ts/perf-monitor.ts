/**
 * perf-monitor.ts
 * Performance monitoring and measurement utility for development
 */

console.log('PerfMonitor loaded');

import { getString, setString } from './storage-utils.js';

(() => {
    'use strict';

    const STORAGE_KEY = 'app.perfMonitor.enabled';

    // ===== Types =====

    interface ReportOptions {
        clear?: boolean;
        topN?: number;
    }

    interface PerfMonitorInstance {
        enabled: boolean;
        marks: Set<string>;
        enable(): void;
        disable(): void;
        toggle(): void;
        mark(name: string): void;
        measure(name: string, startMark?: string, endMark?: string): PerformanceMeasure | null;
        report(options?: ReportOptions): PerformanceMeasure[];
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

            if (measures.length) {
                const logger = (window as typeof window & { Logger?: Console }).Logger || console;
                logger.group('PerfMonitor report');
                for (const m of measures) {
                    logger.info('PerfMonitor', `${m.name}: ${m.duration.toFixed(2)}ms`);
                }
                logger.groupEnd();
            }
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
    };

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
