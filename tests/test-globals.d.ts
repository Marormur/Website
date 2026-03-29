declare interface TestWindowTabCollection {
    size: number;
}

declare interface TestWindowSession {
    id?: string;
}

declare interface TestManagedWindow {
    id?: string;
    type?: string;
    tabs?: TestWindowTabCollection | null;
    sessions?: TestWindowSession[];
    activeSession?: TestWindowSession | null;
    bringToFront?: () => void;
    setActiveTab?: (id: string) => void;
    createSession?: (title?: string) => void;
    createDocument?: (title?: string) => void;
}

declare interface TestWindowRegistry {
    getAllWindows: (type?: string) => TestManagedWindow[];
    getWindowsByType: (type: string) => TestManagedWindow[];
    getActiveWindow: () => (TestManagedWindow & { id?: string }) | null;
    closeAllWindows: () => void;
}

declare interface TestWindowFactory {
    create?: (...args: unknown[]) => TestManagedWindow | null | undefined;
    focusOrCreate?: (...args: unknown[]) => TestManagedWindow | void;
}

declare interface TestMenuRegistry {
    getMenusForAppType: (appType: string) => unknown[];
    debug?: () => string[];
}

declare interface TestMenuSystem {
    renderApplicationMenu: (modalId?: string | null) => void;
}

declare interface Window {
    WindowRegistry: TestWindowRegistry;
    __WindowRegistry: TestWindowRegistry;
    FinderWindow?: TestWindowFactory;
    TerminalWindow?: TestWindowFactory;
    TextEditorWindow?: TestWindowFactory;
    PhotosWindow?: TestWindowFactory;
    FinderInstanceManager?: Record<string, unknown>;
    TextEditorInstanceManager?: {
        destroyAllInstances?: () => void;
    };
    TerminalInstanceManager?: {
        destroyAllInstances?: () => void;
    };
    LaunchpadSystem?: {
        init?: (...args: unknown[]) => void;
    };
    MultiWindowSessionManager?: {
        saveSession?: (opts?: { immediate?: boolean }) => void;
        getSessionInfo?: () => { windowCount?: number } | null;
    };
    SessionManager?: {
        saveAll?: (opts?: { immediate?: boolean }) => void;
    };
    PerfMonitor?: {
        enabled?: boolean;
        enable: () => void;
        mark: (name: string) => void;
        measure: (name: string, startMark?: string, endMark?: string) => void;
        report: () => PerformanceMeasure[];
    };
    MenuRegistry?: TestMenuRegistry;
    MenuSystem?: TestMenuSystem;
    __SESSION_RESTORED?: boolean;
    __zIndexManager?: {
        getWindowStack: () => string[];
    };
    USE_BUNDLE?: boolean | null;
    prefetchCalled?: boolean;
    testPrefetchCalled?: () => void;
}
