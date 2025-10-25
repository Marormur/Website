import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
});

export default [
    // JavaScript Dateien
    {
        files: ['**/*.js'],
            ignores: ['tests/**/*.spec.js', 'playwright.config.js', 'postcss.config.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: {
                // Browser
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                location: 'readonly',
                localStorage: 'readonly',
                fetch: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                Event: 'readonly',
                CustomEvent: 'readonly',
                HTMLElement: 'readonly',
                    navigator: 'readonly',
                    Element: 'readonly',
                    Node: 'readonly',
                    MouseEvent: 'readonly',
                    KeyboardEvent: 'readonly',
                    DOMParser: 'readonly',
                    FileReader: 'readonly',
                    Blob: 'readonly',
                    URL: 'readonly',
                    atob: 'readonly',
                    btoa: 'readonly',
                    getComputedStyle: 'readonly',
                    requestAnimationFrame: 'readonly',
                    cancelAnimationFrame: 'readonly',
                    AbortController: 'readonly',
                    MutationObserver: 'readonly',
                    TextDecoder: 'readonly',
                    TextEncoder: 'readonly',
                    alert: 'readonly',
                    confirm: 'readonly',
                    prompt: 'readonly',
                    sessionStorage: 'readonly',
                
                // Node.js
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
                process: 'readonly',
                
                // App Globals
                Dialog: 'readonly',
                WindowManager: 'readonly',
                ActionBus: 'readonly',
                API: 'readonly',
                Logger: 'readonly',
                ThemeSystem: 'readonly',
                DockSystem: 'readonly',
                MenuSystem: 'readonly',
                DesktopSystem: 'readonly',
                SystemUI: 'readonly',
                StorageSystem: 'readonly',
                FinderSystem: 'readonly',
                IconManager: 'readonly',
                LaunchpadSystem: 'readonly',
                TerminalSystem: 'readonly',
                TextEditorSystem: 'readonly',
                SettingsSystem: 'readonly',
                ContextMenuSystem: 'readonly',
                appI18n: 'readonly',
                translate: 'readonly',
                
                    // Legacy app.js globals (werden sukzessive entfernt)
                    topZIndex: 'writable',
                    hideMenuDropdowns: 'readonly',
                    saveOpenModals: 'readonly',
                    updateDockIndicators: 'readonly',
                    updateProgramLabelByTopModal: 'readonly',
                    saveWindowPositions: 'readonly',
                    getMenuBarBottom: 'readonly',
                    getDockReservedBottom: 'readonly',
                    hideSnapPreview: 'readonly',
                    showSnapPreview: 'readonly',
                    computeSnapMetrics: 'readonly',
                    clampWindowToMenuBar: 'readonly',
                    restoreWindowPositions: 'readonly',
                    restoreOpenModals: 'readonly',
                    initSystemStatusControls: 'readonly',
                    initDesktop: 'readonly',
                    initDockMagnification: 'readonly',
                    renderApplicationMenu: 'readonly',
                    updateAllSystemStatusUI: 'readonly',
                    handleMenuActionActivation: 'readonly',
                    readFinderState: 'readonly',
                    writeFinderState: 'readonly',
                    clearFinderState: 'readonly',
                    showTab: 'readonly',
                    postToTextEditor: 'readonly',
                    setThemePreference: 'readonly',
                    getThemePreference: 'readonly',
            },
        },
        rules: {
            // Fehler verhindern
                'no-unused-vars': ['warn', { 
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                }],
                'no-undef': 'warn', // Warn statt error wegen Legacy-Code
                'no-redeclare': 'warn', // Warn wegen Kompatibilitätsfunktionen
                'no-use-before-define': 'off', // Häufiges Muster in Legacy-Code
            
            // Code-Style
            'no-console': 'off',
            'semi': ['warn', 'always'],
            'quotes': ['warn', 'single', { avoidEscape: true }],
            'indent': ['warn', 4, { SwitchCase: 1 }],
            'comma-dangle': ['warn', 'only-multiline'],
            
            // Best Practices
                'eqeqeq': ['warn', 'always'], // Warn statt error für schrittweise Migration
            'no-var': 'warn',
            'prefer-const': 'warn',
            
                // TypeScript-Vorbereitung (gelockert für Legacy-Code)
                'no-implicit-globals': 'off', // Legacy-Code nutzt globale Funktionen
                'strict': 'off', // Viele Legacy-Dateien haben kein 'use strict'
        },
    },
    
        // Test-Dateien (ES6 Modules)
        {
            files: ['tests/**/*.js', 'playwright.config.js', 'postcss.config.js'],
            languageOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                globals: {
                    // Browser
                    window: 'readonly',
                    document: 'readonly',
                    console: 'readonly',
                    navigator: 'readonly',
                    DataTransfer: 'readonly',
                    DragEvent: 'readonly',
                },
            },
            rules: {
                'no-unused-vars': ['warn', { 
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                }],
                'no-undef': 'warn',
            },
        },
    
    // TypeScript Dateien
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },
    
    // Ignorierte Dateien
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'test-results/**',
            'playwright-report/**',
            '.playwright-mcp/**',
        ],
    },
];
