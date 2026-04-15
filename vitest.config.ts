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
                // Global threshold – weighted average across all coverage-included files.
                statements: 66,
                branches: 52,
                functions: 72,
                lines: 69,

                'src/ts/core/vdom.ts': {
                    statements: 80,
                    branches: 65,
                    functions: 95,
                    lines: 80,
                },
                'src/ts/services/i18n.ts': {
                    statements: 62,
                    branches: 53,
                    functions: 75,
                    lines: 64,
                },
                'src/ts/services/storage-utils.ts': {
                    statements: 70,
                    branches: 90,
                    functions: 90,
                    lines: 70,
                },
                'src/ts/services/virtual-fs.ts': {
                    statements: 62,
                    branches: 44,
                    functions: 65,
                    lines: 65,
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
