/**
 * vitest.config.ts
 * Vitest configuration for unit tests.
 *
 * Uses jsdom environment to provide browser globals (localStorage, window, etc.)
 * required by the service modules under test.
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        // Use jsdom to emulate a browser environment (provides localStorage, window, navigator…)
        environment: 'jsdom',
        // Inject Vitest globals (describe, it, expect, vi…) without explicit imports in each file
        globals: true,
        // Only run files under tests/unit/
        include: ['tests/unit/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            // Only measure coverage for the core service files
            include: [
                'src/ts/services/virtual-fs.ts',
                'src/ts/services/i18n.ts',
                'src/ts/services/storage-utils.ts',
                'src/ts/core/vdom.ts',
            ],
            thresholds: {
                // Global threshold covers the weighted average across all included files.
                // virtual-fs.ts contains ~250 lines of IndexedDB adapter code that require
                // a full browser environment and cannot be unit tested with jsdom – this
                // brings the global average down from the 70 % target.
                statements: 60,
                branches: 55,
                functions: 48,
                lines: 63,

                // Per-file thresholds for files where 70 %+ is achievable in jsdom:
                'src/ts/core/vdom.ts': {
                    statements: 80,
                    branches: 65,
                    functions: 95,
                    lines: 80,
                },
                'src/ts/services/i18n.ts': {
                    statements: 70,
                    branches: 60,
                    functions: 75,
                    lines: 75,
                },
                'src/ts/services/storage-utils.ts': {
                    statements: 70,
                    branches: 90,
                    functions: 90,
                    lines: 70,
                },
                // virtual-fs.ts: lower threshold due to IndexedDB adapter (~250 lines)
                // that requires a real browser / IndexedDB environment and cannot be
                // exercised in jsdom.  The non-adapter business logic IS covered.
                'src/ts/services/virtual-fs.ts': {
                    statements: 45,
                    branches: 40,
                    functions: 30,
                    lines: 48,
                },
            },
        },
        // Suppress console output during tests to keep output readable
        silent: true,
    },
    resolve: {
        alias: {
            // Align the @/* alias with the TypeScript source tree that coverage targets
            '@': resolve(__dirname, 'src/ts'),
        },
    },
});
