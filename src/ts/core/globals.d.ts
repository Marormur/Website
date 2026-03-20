import type { AppI18n } from '../services/i18n.js';

/**
 * Global type declarations for the macOS-style portfolio website.
 *
 * This file augments the browser Window interface with properly typed
 * declarations for all app-level globals. Prefer adding specific shapes
 * here over using `(window as any)` in module code.
 *
 * Naming convention: CamelCase for class/system globals, lowercase for
 * legacy function helpers.
 */

export {};

// ── Shared minimal shapes ─────────────────────────────────────────────────────

/** Shape of the centralised z-index / window-stack manager. */
interface ZIndexManagerShape {
    bringToFront(
        windowId: string,
        modal?: HTMLElement | null,
        windowEl?: HTMLElement | null
    ): number;
    removeWindow(windowId: string): void;
    getWindowStack(): string[];
    restoreWindowStack(stack: string[]): void;
    reset(): void;
    getTopWindowId(): string | null;
    getTopWindowElement(): HTMLElement | null;
    getTopZIndex(): number;
    bumpZIndex(): number;
    ensureTopZIndex(z: number): number;
    syncFromDOM(): number;
}

/** Shape of the DOMUtils helper object exposed on window. */
interface DOMUtilsShape {
    show(element: HTMLElement | null): void;
    hide(element: HTMLElement | null): void;
    toggle(element: HTMLElement | null, visible?: boolean): void;
    isVisible(element: HTMLElement | null): boolean;
    setVisibility(element: HTMLElement | null, visible: boolean): void;
    showAll(elements: (HTMLElement | null)[]): void;
    hideAll(elements: (HTMLElement | null)[]): void;
    getById(id: string): HTMLElement | null;
    query<T extends HTMLElement = HTMLElement>(selector: string, parent?: ParentNode): T | null;
    queryAll<T extends HTMLElement = HTMLElement>(
        selector: string,
        parent?: ParentNode
    ): NodeListOf<T>;
}

/** Minimal ActionBus interface used across modules. */
interface ActionBusShape {
    register(
        actionName: string,
        handler: (params: Record<string, string>, el?: HTMLElement | null) => void
    ): void;
    registerAll(
        actions: Record<string, (params: Record<string, string>, el?: HTMLElement | null) => void>
    ): void;
    execute(
        actionName: string,
        params?: Record<string, string>,
        element?: HTMLElement | null
    ): void;
    dispatch?: (action: string, payload?: unknown) => void;
}

/** Minimal instance-manager shape used by session/integration code. */
interface InstanceManagerShape {
    getAllInstances(): Array<{ instanceId: string; show?: () => void; hide?: () => void }>;
    getActiveInstance(): { instanceId: string } | null;
    getAllInstanceIds?: () => string[];
    getInstanceCount(): number;
    setActiveInstance(id: string): void;
    createInstance(cfg?: { title?: string }): { instanceId: string } | null;
    destroyInstance(id: string): void;
    hasInstances(): boolean;
    serializeAll?: () => unknown;
    deserializeAll?: (data: unknown) => void;
}

/** Minimal WindowManager shape for legacy-interop code. */
interface WindowManagerShape {
    getTopZIndex?: () => number;
    getTopWindow?: () => { id: string } | null;
    getConfig?: (id: string) => unknown;
    register?: (cfg: Record<string, unknown>) => void;
    registerAll?: (cfgs: unknown[]) => void;
    setDialogInstance?: (id: string, instance: unknown) => void;
    getCurrentMenuModalId?: () => string | null;
    renderApplicationMenu?: (modalId?: string | null) => void;
    open?: (id: string) => void;
    bringToFront?: (id: string) => void;
}

/** Shape of the application menu / menu rendering system. */
interface MenuSystemShape {
    renderApplicationMenu(activeModalId?: string | null): void;
    handleMenuActionActivation?: (event: Event) => void;
    menuDefinitions?: Record<string, unknown>;
    getCurrentMenuModalId(): string | null;
}

// ── Window augmentation ───────────────────────────────────────────────────────

declare global {
    interface Window {
        // ── Instance Managers ─────────────────────────────────────────────
        TerminalInstanceManager?: InstanceManagerShape;
        TextEditorInstanceManager?: InstanceManagerShape;
        FinderInstanceManager?: InstanceManagerShape;
        /** Generic InstanceManager factory (legacy entry point). */
        InstanceManager?: InstanceManagerShape & {
            create?: (type: string, cfg?: Record<string, unknown>) => InstanceManagerShape;
        };

        // ── App Systems ───────────────────────────────────────────────────
        FinderSystem?: {
            init?: () => void;
            openFinder?: () => void;
            closeFinder?: () => void;
            openItem?: (name: string, type: string) => void | Promise<void>;
            navigateTo?: (
                path: string[] | string,
                view?: 'computer' | 'github' | 'favorites' | 'recent' | null
            ) => void;
            navigateUp?: () => void;
            navigateToFolder?: (folderName: string) => void;
            getState?: () => {
                viewMode?: 'list' | 'grid' | 'columns' | 'gallery';
                currentPath: string[];
                currentView?: 'computer' | 'github' | 'favorites' | 'recent';
                githubRepos?: unknown[];
            } | null;
            setViewMode?: (mode: 'list' | 'grid' | 'columns' | 'gallery') => void;
            setSortBy?: (field: 'name' | 'date' | 'size' | 'type') => void;
            toggleFavorite?: (path: string) => void;
        };
        SettingsSystem?: {
            container?: HTMLElement | null;
            init?: (containerOrId: HTMLElement | string) => void;
            showSection?: (section: 'general' | 'display' | 'language') => void;
        };
        appI18n?: AppI18n;
        TerminalSystem?: {
            container?: HTMLElement | null;
            init?: (container: HTMLElement) => void;
        };
        TextEditorSystem?: {
            container?: HTMLElement | null;
            init?: (container: HTMLElement) => void;
            loadRemoteFile?: (opts: Record<string, unknown>) => void;
            sendMenuAction?: (actionType: string) => void;
        };
        PhotosApp?: {
            init?: () => void;
        };
        /** Build Photos app content DOM (called by PhotosWindow) */
        PhotosAppBuildContent?: () => {
            container: HTMLElement;
            detailOverlay: HTMLElement;
        };
        /** Attach Photos app to window element */
        PhotosAppAttachToWindow?: (win: HTMLElement) => void;
        /** PhotosWindow class for creating photos viewer windows */
        PhotosWindow?: {
            create?: (config?: { title?: string }) => unknown;
            focusOrCreate?: (config?: { title?: string }) => unknown;
        };
        /** PreviewWindow class for creating preview windows */
        PreviewWindow?: {
            create?: (config?: { title?: string }) => unknown;
            focusOrCreate?: (config?: { title?: string }) => unknown;
            getActiveViewerState?: () => {
                hasImage: boolean;
                src: string;
                title?: string;
            } | null;
            openActiveImageInNewTab?: () => void;
            downloadActiveImage?: () => void;
        };
        DockSystem?: {
            init?: () => void;
            update?: () => void;
            updateDockIndicators?: () => void;
            initDockMagnification?: () => void;
            initDockDragDrop?: () => void;
            getDockReservedBottom?: () => number;
            getCurrentDockOrder?: () => string[];
            loadDockOrder?: () => string[] | null;
            saveDockOrder?: (order: string[]) => void;
            applyDockOrder?: (order: string[]) => void;
            getDockPreferences?: () => {
                size: number;
                magnification: number;
                position: 'bottom' | 'left' | 'right';
                minimizeEffect: 'genie' | 'scale';
                titlebarDoubleClickAction: 'zoom' | 'minimize';
                minimizeWindowsIntoAppIcon: boolean;
                autoHide: boolean;
                animateOpeningApps: boolean;
                showOpenIndicators: boolean;
                showRecentApps: boolean;
            };
            setDockPreferences?: (preferences: {
                size: number;
                magnification: number;
                position: 'bottom' | 'left' | 'right';
                minimizeEffect: 'genie' | 'scale';
                titlebarDoubleClickAction: 'zoom' | 'minimize';
                minimizeWindowsIntoAppIcon: boolean;
                autoHide: boolean;
                animateOpeningApps: boolean;
                showOpenIndicators: boolean;
                showRecentApps: boolean;
            }) => unknown;
            updateDockPreferences?: (preferences: Record<string, unknown>) => unknown;
            applyDockPreferences?: (preferences?: Record<string, unknown> | unknown) => void;
            getTitlebarDoubleClickAction?: () => 'zoom' | 'minimize';
            animateWindowMinimize?: (
                windowElement: HTMLElement,
                windowId: string,
                onComplete?: () => void
            ) => boolean;
        };
        LaunchpadSystem?: {
            container?: HTMLElement | null;
            init?: (container: HTMLElement) => void;
            refresh?: () => void;
            clearSearch?: () => void;
        };
        /** Icon rendering system. */
        IconSystem?: {
            SYSTEM_ICONS?: Record<string, string>;
            ensureSvgNamespace?: (svg: string) => string;
            getMenuIconSvg?: (icon: string) => string;
            renderIconIntoElement?: (el: HTMLElement, svg: string, icon: string) => void;
        };
        IconThemeSystem?: {
            getProgramIconTheme?: () => 'emoji' | 'custom';
            setProgramIconTheme?: (theme: 'emoji' | 'custom') => void;
            getProgramIcon?: (iconKey: string) => string;
            refreshProgramIcons?: (root?: ParentNode) => void;
        };
        /** Theme toggle helpers (legacy). */
        SystemUI?: {
            handleSystemToggle?: (mode: string) => void;
        };
        ThemeSystem?: {
            setThemePreference?: (pref: 'dark' | 'light' | 'system') => void;
        };
        /** Multi-instance modal integration. */
        multiInstanceIntegration?: {
            init?: () => void;
            showInstance?: (type: string, id: string) => void;
            updateInstanceVisibility?: (type: string) => void;
        };
        /** Multi-instance modal integration (capitalized alias). */
        MultiInstanceIntegration?: {
            init?: () => void;
            showInstance?: (type: string, id: string) => void;
            updateInstanceVisibility?: (type: string) => void;
        };

        // ── Menu & Menubar ────────────────────────────────────────────────
        MenuSystem?: MenuSystemShape;
        /** Send a typed action to the active TextEditor instance (legacy helper). */
        sendTextEditorMenuAction?: (actionType: string) => void;
        /** Create a menu context object (called by menu.ts internals). */
        createMenuContext?: ((...args: unknown[]) => unknown) | null;
        /** Bind a dropdown trigger button for hover/click behaviour. */
        bindDropdownTrigger?: (
            button: HTMLElement,
            options?: { hoverRequiresOpen?: boolean }
        ) => void;
        hideMenuDropdowns?: () => void;

        // ── Window & Dialog helpers ───────────────────────────────────────
        WindowManager?: WindowManagerShape;
        WindowChrome?: {
            createStatusBar?: (config: {
                leftContent?: string;
                rightContent?: string;
            }) => HTMLElement;
        };
        /** Legacy Dialog constructor exposed on window. */
        Dialog?: new (id: string) => {
            open?: () => void;
            close?: () => void;
            minimize?: () => void;
            toggleMaximize?: () => void;
            center?: () => void;
            bringToFront?: () => void;
            modal?: HTMLElement;
        };
        /** Singleton WindowRegistry instance. */
        WindowRegistry?: {
            registerWindow?: (win: unknown) => void;
            removeWindow?: (id: string) => void;
            getWindow?: (id: string) => unknown;
            getAllWindows?: (type?: string) => unknown[];
            getWindowsByType?: (type: string) => unknown[];
            getActiveWindow?: () => {
                id: string;
                type?: string;
                activeTabId?: string | null;
                tabs?: Map<string, unknown>;
                close?: () => void;
                removeTab?: (id: string) => void;
                createSession?: (title?: string) => unknown;
                minimize?: () => void;
            } | null;
            setActiveWindow?: (id: string | null) => void;
            getWindowCount?: (type?: string) => number;
            getTopWindow?: () => unknown;
            closeAllWindows?: () => void;
        };
        /** BaseWindow class reference for legacy consumers. */
        BaseWindow?: unknown;
        /** BaseWindowInstance class reference for legacy consumers. */
        BaseWindowInstance?: unknown;
        /** BaseTab class reference for legacy consumers. */
        BaseTab?: unknown;
        /** TerminalSession class for creating terminal sessions (constructor reference). */
        TerminalSession?: new (config?: { id?: string; title?: string }) => {
            id: string;
            title: string;
            show?: () => void;
            hide?: () => void;
        };
        /** TerminalWindow class/factory for creating terminal windows. */
        TerminalWindow?: { create?: (config?: { title?: string }) => unknown };
        /** TextEditorDocument class for creating editor documents (constructor reference). */
        TextEditorDocument?: new (config?: {
            id?: string;
            title?: string;
            content?: { content?: string };
        }) => { id: string; title: string; show?: () => void; hide?: () => void };
        /** TextEditorWindow class/factory for creating text editor windows. */
        TextEditorWindow?: {
            create?: (config?: { title?: string }) => unknown;
            focusOrCreate?: (config?: { title?: string }) => unknown;
        };
        /** FinderView class for creating finder views/tabs (constructor reference). */
        FinderView?: new (config?: {
            id?: string;
            title?: string;
            source?: 'computer' | 'github' | 'recent' | 'starred';
            icon?: string;
        }) => {
            id: string;
            title: string;
            show?: () => void;
            hide?: () => void;
            refresh?: () => void;
        };
        /** FinderWindow class/factory for creating finder windows. */
        FinderWindow?: {
            create?: (config?: { title?: string; getWindowCount?: () => number }) => unknown;
            focusOrCreate?: () => void;
        };
        /** API facade for the application. */
        API?: {
            window?: {
                close?: (id: string) => void;
            };
        };
        GitHubAPI?: {
            getHeaders?: () => Record<string, string>;
            readCache?: (kind: string, repo?: string, subPath?: string) => unknown;
            writeCache?: (kind: string, repo: string, subPath: string, data: unknown) => void;
            fetchJSON?: (url: string) => Promise<unknown>;
            fetchUserRepos?: (username: string, opts?: Record<string, unknown>) => Promise<unknown>;
            fetchRepoContents?: (
                username: string,
                repo: string,
                subPath?: string,
                opts?: Record<string, unknown>
            ) => Promise<unknown>;
            prefetchUserRepos?: (username: string) => void;
            getCacheState?: (kind: string, repo?: string, subPath?: string) => unknown;
            isCacheStale?: (kind: string, repo?: string, subPath?: string) => boolean;
        };
        /** Open the program info modal from the menu. */
        openProgramInfoFromMenu?: (infoModalId: string | null) => void;
        /** WindowTabs generic tab-bar system for windows. */
        WindowTabs?: {
            create?: (
                manager: {
                    getAllInstances: () => Array<{
                        instanceId: string;
                        title?: string;
                        show?: () => void;
                        hide?: () => void;
                    }>;
                    getActiveInstance: () => { instanceId: string } | null;
                    getAllInstanceIds: () => string[];
                    getInstance?: (id: string) => { instanceId: string } | null;
                    setActiveInstance: (id: string) => void;
                    createInstance: (cfg?: { title?: string }) => { instanceId: string } | null;
                    destroyInstance: (id: string) => void;
                    reorderInstances?: (order: string[]) => void;
                    detachInstance?: (id: string) => { instanceId: string } | null;
                    adoptInstance?: (inst: unknown) => unknown;
                },
                tabBar: HTMLElement,
                options?: { addButton?: boolean; onCreateInstanceTitle?: () => string | undefined }
            ) => {
                el: HTMLElement;
                refresh: () => void;
                destroy: () => void;
                setTitle: (id: string, title: string) => void;
            } | null;
        };
        /** MultiWindowSessionManager singleton. */
        MultiWindowSessionManager?: {
            saveSession?: (opts?: { immediate?: boolean }) => void;
            restoreSession?: () => Promise<boolean>;
            getSessionInfo?: () => Record<string, unknown> | null;
            debugLog?: () => void;
        };
        /** Bring all open windows to front. */
        bringAllWindowsToFront?: () => void;
        /** Test mode flag for E2E helpers. */
        __TEST_MODE__?: boolean;
        /** Central z-index manager (shared between legacy WindowManager and new system). */
        __zIndexManager?: ZIndexManagerShape;

        // ── Session & Persistence helpers ─────────────────────────────────
        SessionManager?: {
            saveInstanceType?: (type: string) => void;
            saveWindowState?: (state: unknown) => void;
            restoreSession?: () => boolean;
        };
        saveOpenModals?: () => void;
        saveWindowPositions?: () => void;

        // ── Menubar / UI position helpers (legacy JS globals) ─────────────
        getMenuBarBottom?: () => number;
        getDockReservedBottom?: () => number;
        updateDockIndicators?: () => void;
        updateProgramLabelByTopModal?: () => void;
        clampWindowToMenuBar?: (element: HTMLElement) => void;
        bringDialogToFront?: (id: string) => void;

        // ── Snap helpers ──────────────────────────────────────────────────
        computeSnapMetrics?: (
            side: 'left' | 'right'
        ) => { left: number; top: number; width: number; height: number } | null | undefined;
        showSnapPreview?: (side: 'left' | 'right') => void;
        hideSnapPreview?: () => void;

        // ── Photos / Preview / Image viewer helpers ───────────────────────
        getImageViewerState?: () => { hasImage: boolean; src: string; title?: string } | null;
        openActiveImageInNewTab?: () => void;
        downloadActiveImage?: () => void;

        // ── Keyboard & i18n ───────────────────────────────────────────────
        KeyboardShortcuts?: {
            setContextResolver?: (resolver: () => string) => void;
            register?: (shortcut: string, handler: () => void) => void;
        };
        appI18n?: {
            translate?: (
                key: string,
                paramsOrFallback?: Record<string, unknown> | string,
                options?: { fallback?: string }
            ) => string;
            applyTranslations?: (root?: HTMLElement | null) => void;
        };

        // ── ActionBus ────────────────────────────────────────────────────
        ActionBus?: ActionBusShape;
        /** Compatibility alias */
        __ActionBus?: ActionBusShape;

        // ── DOMUtils ─────────────────────────────────────────────────────
        DOMUtils?: DOMUtilsShape;

        // ── Performance Monitor ───────────────────────────────────────────
        PerfMonitor?: {
            mark: (name: string) => void;
            measure: (name: string, startMark?: string, endMark?: string) => void;
        };

        // ── StorageSystem ─────────────────────────────────────────────────
        StorageSystem?: {
            getDialogWindowElement?: (idOrElement: string | HTMLElement) => HTMLElement | null;
        };

        // ── VDOM System ───────────────────────────────────────────────────
        VDOM?: {
            h: (
                type: string,
                props: Record<string, unknown> | null,
                ...children: unknown[]
            ) => unknown;
            createElement: (vnode: unknown) => HTMLElement | Text;
            diff: (oldVTree: unknown, newVTree: unknown) => unknown[];
            patch: (element: HTMLElement, patches: unknown[], oldVTree?: unknown) => HTMLElement;
            EventDelegator: new (rootElement: HTMLElement) => unknown;
            measurePerf: <T>(fn: () => T, label?: string) => { result: T; time: number };
        };

        // ── Legacy tab-render helper (called on restored windows) ─────────
        /** @deprecated Exposed by legacy code; prefer typed window methods. */
        _renderTabs?: () => void;

        // ── Demo helpers ──────────────────────────────────────────────────
        demoCreateTerminals?: () => void;

        // ── E2E hooks ─────────────────────────────────────────────────────
        /** Set to true once core modules are loaded and DOM is ready. */
        __APP_READY?: boolean;
        /** Set to true once session restore is complete. */
        __SESSION_RESTORED?: boolean;

        // ── Session-restore lifecycle flags ───────────────────────────────
        /** Promise that resolves when session restore has finished (success or failure). */
        __sessionRestorePromise?: Promise<void>;
        /** True while session restore is actively running. */
        __SESSION_RESTORE_IN_PROGRESS?: boolean;
        /** True once session restore has finished (either succeeded or failed). */
        __SESSION_RESTORE_DONE?: boolean;
        /** True when the multi-window session manager is active. */
        __MULTI_WINDOW_SESSION_ACTIVE?: boolean;

        // ── Bundle / init flags ───────────────────────────────────────────
        /** Present (truthy) when the app is loaded in bundle mode. */
        __BUNDLE_READY__?: boolean;
        /** Truthy once VirtualFS is queryable through any active session. */
        __VirtualFS_Ready?: boolean;
        /** Alias of WindowRegistry exposed for legacy debug access. */
        __WindowRegistry?: typeof globalThis extends { WindowRegistry: infer R } ? R : unknown;

        // ── Configuration ─────────────────────────────────────────────────
        /** GitHub username for the portfolio owner (fallback: 'Marormur') */
        GITHUB_USERNAME?: string;

        // ── Dialog registry ───────────────────────────────────────────────
        dialogs?: Record<
            string,
            {
                open?: () => void;
                close?: () => void;
                minimize?: () => void;
                toggleMaximize?: () => void;
                center?: () => void;
                bringToFront?: () => void;
            }
        >;

        // ── Misc window configurations ────────────────────────────────────
        windowConfigurations?: unknown[];
    }
}
