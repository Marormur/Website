declare type Page = import('@playwright/test').Page;
declare type Locator = import('@playwright/test').Locator;

declare interface TestWindowTabCollection {
    size: number;
    get?: (id: string) => TestWindowSession | unknown;
    keys?: () => IterableIterator<string>;
    values: () => IterableIterator<TestWindowSession>;
    set?: (id: string, value: unknown) => void;
    clear?: () => void;
    [key: string]: unknown;
}

declare interface TestWindowSession {
    id?: string;
    sessionId?: string;
    vfsCwd?: string;
    currentPath?: string;
    commandHistory?: string[];
    outputElement?: Element | null;
    contentState?: { content?: string; [key: string]: unknown };
    executeCommand?: (command: string) => Promise<unknown> | unknown;
    updateContentState?: (state: unknown) => void;
    addOutput?: (output: string, type?: string) => void;
    clearOutput?: () => void;
    [key: string]: unknown;
}

declare interface TestManagedWindow {
    id?: string;
    windowId?: string;
    type?: string;
    zIndex?: number;
    activeTabId?: string | null;
    tabs?: TestWindowTabCollection | null;
    sessions?: TestWindowSession[];
    activeSession?: TestWindowSession | null;
    windowElement?: Element | null;
    element?: Element | null;
    bringToFront?: () => void;
    close?: () => void;
    removeTab?: (id: string) => void;
    setActiveTab?: (id: string) => void;
    createSession?: (title?: string) => TestWindowSession | null | undefined;
    createDocument?: (title?: string) => void;
    createView?: (title?: string) => { title?: string } | null;
    createGithubView?: (title?: string) => { title?: string } | null;
    metadata?: Record<string, unknown>;
    activeView?: {
        openGithubProjects?: () => Promise<unknown> | unknown;
        navigateToPath?: (path: string) => Promise<unknown> | unknown;
        openItem?: (itemName: string) => Promise<unknown> | unknown;
        [key: string]: unknown;
    } | null;
    reorderTab?: (tabId: string, newIndex: number) => void;
    _renderTabs?: () => void;
    isMaximized?: boolean;
    [key: string]: unknown;
}

declare interface TestWindowRegistry {
    getAllWindows: (type?: string) => TestManagedWindow[];
    getWindowsByType: (type: string) => TestManagedWindow[];
    getActiveWindow: () => (TestManagedWindow & { id?: string }) | null;
    getWindow: (id: string) => TestManagedWindow | null;
    getTopWindow: () => TestManagedWindow | null;
    closeAllWindows: () => void;
    [key: string]: unknown;
}

declare interface TestWindowFactory {
    (...args: unknown[]): TestManagedWindow | null | undefined;
    create: (...args: unknown[]) => TestManagedWindow | null | undefined;
    focusOrCreate: (...args: unknown[]) => TestManagedWindow | null | undefined;
    [key: string]: unknown;
}

declare interface TestMenuRegistry {
    getMenusForAppType: (appType: string) => unknown[];
    debug?: () => string[];
    [key: string]: unknown;
}

declare interface TestMenuSystem {
    renderApplicationMenu: (modalId?: string | null) => void;
    [key: string]: unknown;
}

declare interface Window {
    WindowRegistry: TestWindowRegistry;
    __WindowRegistry: TestWindowRegistry;
    FinderWindow?: TestWindowFactory;
    TerminalWindow?: TestWindowFactory;
    TextEditorWindow?: TestWindowFactory;
    PhotosWindow?: TestWindowFactory;
    TextEditorInstanceManager?: {
        destroyAllInstances: () => void;
        createInstance: (
            ...args: unknown[]
        ) => { instanceId?: string; title?: string; [key: string]: unknown } | null | undefined;
        getActiveInstance: () => {
            instanceId?: string;
            title?: string;
            [key: string]: unknown;
        } | null;
        setActiveInstance: (id: string) => void;
        getInstanceCount: () => number;
        getInstance: (id: string) => { instanceId?: string; [key: string]: unknown } | null;
        getAllInstances: () => { instanceId?: string; [key: string]: unknown }[];
        serializeAll: () => unknown;
        deserializeAll: (state: unknown) => void;
        destroyInstance: (id: string) => void;
        [key: string]: unknown;
    };
    TerminalInstanceManager?: {
        destroyAllInstances: () => void;
        createInstance: (
            ...args: unknown[]
        ) =>
            | {
                  instanceId?: string;
                  title?: string;
                  commandHistory?: string[];
                  currentPath?: string;
                  serialize?: () => unknown;
                  deserialize?: (state: unknown) => void;
                  [key: string]: unknown;
              }
            | null
            | undefined;
        getActiveInstance: () => { instanceId?: string; [key: string]: unknown } | null;
        setActiveInstance: (id: string) => void;
        getInstanceCount: () => number;
        getInstance: (id: string) => { instanceId?: string; [key: string]: unknown } | null;
        getAllInstances: () => { instanceId?: string; [key: string]: unknown }[];
        serializeAll: () => unknown;
        deserializeAll: (state: unknown) => void;
        destroyInstance: (id: string) => void;
        [key: string]: unknown;
    };
    LaunchpadSystem?: {
        init?: (...args: unknown[]) => void;
    };
    MultiWindowSessionManager?: {
        saveSession: (opts?: { immediate?: boolean }) => void;
        getSessionInfo: () => { windowCount?: number } | null;
        restoreSession: () => Promise<boolean> | boolean;
        exportSession: () => unknown;
        importSession: (data: unknown) => Promise<boolean> | boolean;
        clearSession: () => void;
        [key: string]: unknown;
    };
    SessionManager?: {
        saveAll: (opts?: { immediate?: boolean }) => void;
        saveAllSessions: () => void;
        clear: () => void;
        getStorageInfo: () => unknown;
        [key: string]: unknown;
    };
    PerfMonitor?: {
        enabled?: boolean;
        enable: () => void;
        mark: (name: string) => void;
        measure: (name: string, startMark?: string, endMark?: string) => void;
        report: () => PerformanceMeasure[];
        getVitals?: () => Record<string, number | undefined>;
        [key: string]: unknown;
    };
    MenuRegistry?: TestMenuRegistry;
    MenuSystem?: TestMenuSystem;
    __SESSION_RESTORED?: boolean;
    __zIndexManager?: {
        getWindowStack: () => string[];
        bringToFront?: (...args: unknown[]) => void;
        [key: string]: unknown;
    };
    USE_BUNDLE?: boolean | null;
    prefetchCalled?: boolean;
    testPrefetchCalled?: () => void;
    VirtualFS?: {
        readFile: (path: string) => string | null;
        writeFile: (path: string, content: string) => void;
        createFile: (path: string, content?: string) => void;
        createFolder: (path: string) => void;
        delete: (path: string) => void;
        rename: (oldPath: string, newName: string) => void;
        exists: (path: string) => boolean;
        reset: () => void;
        forceSaveAsync: () => Promise<void>;
        storage?: { name?: string; [key: string]: unknown };
        list: (path?: string) => Record<string, unknown>;
        [key: string]: unknown;
    };
    MacUI?: {
        [key: string]: unknown;
    };
    VDOM?: {
        [key: string]: unknown;
    };
    toast?: {
        [key: string]: unknown;
    };
    ErrorHandler?: {
        [key: string]: unknown;
    };
    UiModeSystem?: {
        getUIModePreference: () => string | null;
        getEffectiveUIMode: () => string | null;
        setUIModePreference?: (mode: string) => void;
        [key: string]: unknown;
    };
    saveOpenModals?: () => void;
    computeSnapMetrics?: (...args: unknown[]) => unknown;
    __snapTestDrag?: { targetClientX?: number; targetClientY?: number; [key: string]: unknown };
    __MULTI_WINDOW_SESSION_ACTIVE?: boolean;
    [key: string]: unknown;
}
