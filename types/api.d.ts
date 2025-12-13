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
    function register(name: string, handler: (params?: Record<string, string>, element?: HTMLElement) => void): void;
    function registerAll(actions: Record<string, (params?: Record<string, string>, element?: HTMLElement) => void>): void;
    function execute(name: string, params?: Record<string, string>, element?: HTMLElement): void;
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

declare const API: typeof API;

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
