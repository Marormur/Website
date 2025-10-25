/**
 * Centralized Ambient Type Definitions for Window Interface
 * 
 * This file serves as the single source of truth for all Window interface
 * extensions in the application. Individual type files (e.g., action-bus.d.ts)
 * should define their types but NOT extend the Window interface - that happens
 * here only to avoid duplicate identifier errors.
 * 
 * Phase 5: TypeScript Migration - Unified Ambient Types
 */

/// <reference path="./action-bus.d.ts" />
/// <reference path="./api.d.ts" />
/// <reference path="./base-window-instance.d.ts" />
/// <reference path="./dialog.d.ts" />
/// <reference path="./finder.d.ts" />
/// <reference path="./i18n.d.ts" />
/// <reference path="./instance-manager.d.ts" />
/// <reference path="./storage.d.ts" />
/// <reference path="./terminal.d.ts" />
/// <reference path="./text-editor.d.ts" />
/// <reference path="./theme.d.ts" />
/// <reference path="./window-chrome.d.ts" />
/// <reference path="./window-manager.d.ts" />

/**
 * Global Window Interface Extensions
 * 
 * All global objects attached to window are declared here.
 * This prevents duplicate identifier errors when multiple .d.ts files
 * try to extend the Window interface.
 */
declare interface Window {
  // ===== App Initialization =====
  /** Flag indicating the app has fully initialized */
  __APP_READY?: boolean;

  // ===== Core Systems (Phase 3) =====
  /** ActionBus - Declarative event system via data-action attributes */
  ActionBus: ActionBusAPI;
  
  /** API - Unified interface to all modules */
  API: typeof API;
  
  /** BaseWindowInstance - Base class for window instances */
  BaseWindowInstance: typeof BaseWindowInstance;
  
  /** InstanceManager - Multi-instance window support */
  InstanceManager: typeof InstanceManager;
  
  /** WindowChrome - Reusable UI components (titlebars, toolbars, status bars) */
  WindowChrome: WindowChromeAPI;
  
  /** WindowManager - Central window registry, z-index management */
  WindowManager: WindowManagerAPI;

  // ===== System Modules (Phase 3) =====
  /** Dialog - Modal/window management class */
  Dialog: typeof Dialog;
  
  /** FinderSystem - File browser for GitHub repositories */
  FinderSystem: FinderSystemAPI;
  
  /** StorageSystem - localStorage persistence */
  StorageSystem: StorageSystemAPI;
  
  /** TerminalSystem - Terminal emulator */
  TerminalSystem: TerminalSystemAPI;
  
  /** TextEditorSystem - Text editor */
  TextEditorSystem: TextEditorSystemAPI;
  
  /** ThemeSystem - Dark/light mode management */
  ThemeSystem: ThemeSystemAPI;

  // ===== I18n System =====
  /** appI18n - Internationalization API */
  appI18n: AppI18nAPI;
  
  /** translate - Global translation function */
  translate: (key: string) => string;

  // ===== Instance Types (Phase 3) =====
  /** TerminalInstance - Individual terminal instance */
  TerminalInstance: typeof TerminalInstance;
  
  /** TextEditorInstance - Individual text editor instance */
  TextEditorInstance: typeof TextEditorInstance;

  // ===== Instance Managers =====
  /** TerminalInstanceManager - Manages multiple terminal instances */
  TerminalInstanceManager?: InstanceManager<TerminalInstance>;
  
  /** TextEditorInstanceManager - Manages multiple text editor instances */
  TextEditorInstanceManager?: InstanceManager<TextEditorInstance>;

  // ===== Phase 2 Features =====
  /** WindowTabManager - Tab system for windows */
  WindowTabManager: typeof WindowTabManager;
  
  /** KeyboardShortcuts - Global keyboard shortcut system */
  KeyboardShortcuts: {
    register(binding: unknown): () => void;
    setContextResolver(resolver: () => string): void;
  };

  // ===== Phase 4 Modules =====
  /** GitHubAPI - GitHub API utilities */
  GitHubAPI?: {
    getHeaders(): Record<string, string>;
    readCache(kind: string, repo?: string, subPath?: string): unknown;
    writeCache(kind: string, repo: string, subPath: string, data: unknown): void;
    fetchJSON(url: string): Promise<unknown>;
    fetchUserRepos(username: string): Promise<unknown>;
    fetchRepoContents(username: string, repo: string, subPath?: string): Promise<unknown>;
  };
  
  /** ImageViewerUtils - Image viewer utilities */
  ImageViewerUtils?: unknown;

  // ===== Legacy/Utility =====
  /** APP_CONSTANTS - Application constants */
  APP_CONSTANTS?: Record<string, unknown>;
  
  /** topZIndex - Current top z-index (delegated to WindowManager) */
  topZIndex: number;
}

/**
 * TerminalInstance and TextEditorInstance type declarations
 * These are referenced above but defined in their respective files
 */
declare class TerminalInstance extends BaseWindowInstance {
  // Defined in types/terminal.d.ts
}

declare class TextEditorInstance extends BaseWindowInstance {
  // Defined in types/text-editor.d.ts
}

declare class WindowTabManager {
  // Defined in src/ts/window-tabs.ts
}
