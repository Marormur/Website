// Ambient types for global API facade

declare namespace API {
    // Error Handler
    namespace error {
        function enable(): void;
        function disable(): void;
        function getLogs(): unknown[];
        function clearLogs(): void;
        function exportLogs(): void;
    }

    // Performance Monitor
    namespace performance {
        function enable(): void;
        function disable(): void;
        function toggle(): void;
        function mark(name: string): void;
        function measure(name: string, startMark?: string, endMark?: string): void;
        function report(): void;
    }

    // Theme
    namespace theme {
        function setThemePreference(mode: 'system' | 'light' | 'dark'): void;
        function getThemePreference(): 'system' | 'light' | 'dark';
        function applyTheme(): void;
        function initTheme(): void;
    }

    // Window manager
    namespace window {
        function register(config: unknown): void;
        function registerAll(configs: unknown[]): void;
        function getConfig(id: string): unknown;
        function open(id: string): void;
        function close(id: string): void;
        function bringToFront(id: string): void;
        function getTopWindow(): unknown;
        function getProgramInfo(id: string): unknown;
        function getAllWindowIds(): string[];
        function getPersistentWindowIds(): string[];
        function getDialogInstance(id: string): unknown;
        function syncZIndexWithDOM(): void;
    }

    // Action bus
    namespace action {
        function register(
            name: string,
            handler: (params?: Record<string, string>, element?: HTMLElement) => void
        ): void;
        function registerAll(
            actions: Record<
                string,
                (params?: Record<string, string>, element?: HTMLElement) => void
            >
        ): void;
        function execute(
            name: string,
            params?: Record<string, string>,
            element?: HTMLElement
        ): void;
    }

    // I18n
    namespace i18n {
        function translate(key: string, fallback?: string): string;
        function setLanguagePreference(lang: 'system' | 'de' | 'en'): void;
        function getLanguagePreference(): 'system' | 'de' | 'en';
        function getActiveLanguage(): 'de' | 'en';
        function applyTranslations(): void;
    }

    // Storage
    namespace storage {
        function readFinderState(): unknown;
        function writeFinderState(v: unknown): void;
        function clearFinderState(): void;
        function saveOpenModals(): void;
        function restoreOpenModals(): void;
        function saveWindowPositions(): void;
        function restoreWindowPositions(): void;
        function resetWindowLayout(): void;
        function getDialogWindowElement(id: string): HTMLElement | null;
    }

    // Helpers
    namespace helpers {
        function getMenuBarBottom(): number;
        function clampWindowToMenuBar(target: HTMLElement): void;
        function computeSnapMetrics(side: 'left' | 'right' | 'top' | 'bottom'): unknown;
        function showSnapPreview(side: 'left' | 'right' | 'top' | 'bottom'): void;
        function hideSnapPreview(): void;
    }
}

// GitHub API Types
type GitHubCacheState = 'missing' | 'fresh' | 'stale';

interface GitHubFile {
    name: string;
    path: string;
    type: 'file' | 'dir';
    size: number;
    download_url?: string;
    content?: string;
    encoding?: string;
}

// Runtime API object type (combines namespace methods + dynamic GitHub methods)
interface APIObject {
    // Core API namespaces (these are proxies to window modules)
    error: {
        enable(): void;
        disable(): void;
        getLogs(): unknown[];
        clearLogs(): void;
        exportLogs(): void;
    };
    performance: {
        enable(): void;
        disable(): void;
        toggle(): void;
        mark(name: string): void;
        measure(name: string, startMark?: string, endMark?: string): void;
        report(): void;
    };
    theme: {
        setThemePreference(mode: 'system' | 'light' | 'dark'): void;
        getThemePreference(): 'system' | 'light' | 'dark';
        applyTheme(): void;
        initTheme(): void;
    };
    i18n: {
        translate(key: string, fallback?: string): string;
        setLanguagePreference(lang: 'system' | 'de' | 'en'): void;
        getLanguagePreference(): 'system' | 'de' | 'en';
        getActiveLanguage(): 'de' | 'en';
        applyTranslations(): void;
    };
    storage: {
        readFinderState(): unknown;
        writeFinderState(v: unknown): void;
        clearFinderState(): void;
        saveOpenModals(): void;
        restoreOpenModals(): void;
        saveWindowPositions(): void;
        restoreWindowPositions(): void;
        resetWindowLayout(): void;
        getDialogWindowElement(id: string): HTMLElement | null;
    };
    window: {
        register(config: unknown): void;
        registerAll(configs: unknown[]): void;
        getConfig(id: string): unknown;
        open(id: string): void;
        close(id: string): void;
        bringToFront(id: string): void;
        getTopWindow(): unknown;
        getProgramInfo(id: string): unknown;
        getAllWindowIds(): string[];
        getPersistentWindowIds(): string[];
        getDialogInstance(id: string): unknown;
        syncZIndexWithDOM(): void;
    };
    action: {
        register(
            name: string,
            handler: (params?: Record<string, string>, element?: HTMLElement) => void
        ): void;
        registerAll(
            actions: Record<
                string,
                (params?: Record<string, string>, element?: HTMLElement) => void
            >
        ): void;
        execute(name: string, params?: Record<string, string>, element?: HTMLElement): void;
    };
    helpers: {
        getMenuBarBottom(): number;
        clampWindowToMenuBar(target: HTMLElement): void;
        computeSnapMetrics(side: 'left' | 'right' | 'top' | 'bottom'): unknown;
        showSnapPreview(side: 'left' | 'right' | 'top' | 'bottom'): void;
        hideSnapPreview(): void;
    };
    // GitHub API (optional - dynamically attached at runtime)
    fetchRepoContents?: (
        user: string,
        repo: string,
        path?: string
    ) => Promise<GitHubFile | GitHubFile[]>;
    fetchUserRepos?: (
        user: string,
        params?: { per_page?: number; sort?: string }
    ) => Promise<unknown[]>;
    prefetchUserRepos?: (user: string) => void;
    getCacheState?: (
        kind: 'repos' | 'contents',
        repo?: string,
        subPath?: string
    ) => GitHubCacheState;
    readCache?: <T = unknown>(
        kind: 'repos' | 'contents',
        repo?: string,
        subPath?: string
    ) => T | null;
    writeCache?: (kind: 'repos' | 'contents', repo: string, subPath: string, data: unknown) => void;
    isCacheStale?: (kind: 'repos' | 'contents', repo?: string, subPath?: string) => boolean;
}

declare const API: APIObject;

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
