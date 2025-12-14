'use strict';
/**
 * perf-monitor.ts
 * Performance monitoring and measurement utility for development
 */
Object.defineProperty(exports, '__esModule', { value: true });
console.log('PerfMonitor loaded');
const storage_utils_js_1 = require('../services/storage-utils.js');
(() => {
    'use strict';
    const STORAGE_KEY = 'app.perfMonitor.enabled';
    // ===== Helper Functions =====
    function isEnabledByDefault() {
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
    const PerfMonitor = {
        enabled: isEnabledByDefault(),
        marks: new Set(),
        enable() {
            this.enabled = true;
            try {
                (0, storage_utils_js_1.setString)(STORAGE_KEY, 'true');
            } catch (_e) {
                void _e;
            }
            const logger = window.Logger || console;
            logger.info('PerfMonitor', 'Enabled');
        },
        disable() {
            this.enabled = false;
            try {
                (0, storage_utils_js_1.setString)(STORAGE_KEY, 'false');
            } catch (_e) {
                void _e;
            }
            const logger = window.Logger || console;
            logger.info('PerfMonitor', 'Disabled');
        },
        toggle() {
            if (this.enabled) {
                this.disable();
            } else {
                this.enable();
            }
        },
        mark(name) {
            if (!this.enabled || !name) return;
            try {
                performance.mark(name);
                this.marks.add(name);
            } catch (_e) {
                void _e;
            }
        },
        measure(name, startMark, endMark) {
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
                return lastEntry ? lastEntry : null;
            } catch (_e) {
                void _e;
                return null;
            }
        },
        report(options) {
            if (!this.enabled) return [];
            const { clear = false, topN = 10 } = options || {};
            const measures = performance
                .getEntriesByType('measure')
                .slice()
                .sort((a, b) => b.duration - a.duration)
                .slice(0, topN);
            if (measures.length) {
                const logger = window.Logger || console;
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
        window.PerfMonitor = PerfMonitor;
    }
})();
//# sourceMappingURL=perf-monitor.js.map
