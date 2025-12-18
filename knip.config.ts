import type { KnipConfig } from 'knip';

export default {
    project: ['src/ts/**/*.ts', 'scripts/**/*.{js,mjs}'],
    entry: [
        'src/ts/core/app-init.ts',
        'src/ts/compat/expose-globals.ts',
        'src/ts/core/logger.ts',
    ],
    ignore: [
        'js/**/*.js', // Kompilierte Output-Dateien
        'dist/**/*.css', // CSS-Output
        'docs/**/*', // Dokumentation
        'types/**/*.d.ts', // Type Definitionen
        'tests/**/*.spec.js', // Tests
    ],
    ignoreDependencies: [
        // Build tools
        'autoprefixer',
        'esbuild',
        'postcss',
        'tailwindcss',
        'rimraf',

        // ESLint + TypeScript
        'eslint',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
        '@eslint/js',
        '@eslint/eslintrc',

        // Dev Server + Utilities
        'chokidar',
        'express', // Falls später verwendet

        // Optional: CI/CD tools
        'husky',
        'lint-staged',
        'prettier',

        // New tools
        'knip',
        '@lhci/cli',
        'esbuild-bundle-analyzer',
    ],
} as KnipConfig;
