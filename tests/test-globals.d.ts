declare interface TestWindowRegistry {
    getAllWindows: (type?: string) => Array<Record<string, unknown>>;
    getWindowsByType: (type: string) => Array<Record<string, unknown>>;
    getActiveWindow: () => (Record<string, unknown> & { id?: string }) | null;
    closeAllWindows: () => void;
}

declare interface TestWindowFactory {
    create?: (...args: unknown[]) => Record<string, unknown> | null | undefined;
    focusOrCreate?: (...args: unknown[]) => void;
}

declare interface Window {
    WindowRegistry: TestWindowRegistry;
    __WindowRegistry: TestWindowRegistry;
    FinderWindow?: TestWindowFactory;
    TerminalWindow?: TestWindowFactory;
    TextEditorWindow?: TestWindowFactory;
    PhotosWindow?: TestWindowFactory;
    FinderInstanceManager?: Record<string, unknown>;
    TextEditorInstanceManager?: Record<string, unknown>;
    TerminalInstanceManager?: Record<string, unknown>;
    LaunchpadSystem?: {
        init?: (...args: unknown[]) => void;
    };
    MultiWindowSessionManager?: Record<string, unknown>;
    SessionManager?: Record<string, unknown>;
    PerfMonitor?: {
        enabled?: boolean;
        enable?: () => void;
    };
    USE_BUNDLE?: boolean | null;
    prefetchCalled?: boolean;
    testPrefetchCalled?: () => void;
}