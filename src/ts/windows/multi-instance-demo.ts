import logger from '../core/logger.js';
/*
 * Multi-Instance Demo (TypeScript port)
 * Mirrors the convenience demo helpers from `js/multi-instance-demo.js`.
 * It uses runtime guards and local casts to avoid strict-type errors.
 */
export {};

declare global {
    interface Window {
        // Demo helpers
        demoCreateTerminals?: () => void;
        demoCreateEditors?: () => void;
        demoSaveTerminals?: () => void;
        demoRestoreTerminals?: () => void;
        demoTerminalIsolation?: () => void;
        demoEditorContent?: () => void;
        demoWindowChrome?: () => void;
        demoMaxInstances?: () => void;
        demoActiveInstance?: () => void;
        demoEvents?: () => void;
        demoTabs?: () => void;
        demoSessionSave?: () => void;
    }
}

// Helper types for demo functions
type InstanceShape = {
    instanceId: string;
    state?: Record<string, unknown>;
    currentPath?: string;
    commandHistory?: string[];
    on?: (event: string, cb: (data: unknown) => void) => void;
    appendOutput?: (txt: string) => void;
    clearOutput?: () => void;
};

window.demoCreateTerminals = function demoCreateTerminals() {
    if (!window.TerminalInstanceManager) return null;
    logger.group('WINDOW', 'Creating Terminals...');
    const term1 = window.TerminalInstanceManager.createInstance?.({ title: 'Terminal 1 - Main' });
    const term2 = window.TerminalInstanceManager.createInstance?.({ title: 'Terminal 2 - Dev' });
    const term3 = window.TerminalInstanceManager.createInstance?.({ title: 'Terminal 3 - Logs' });
    try {
        logger.debug(
            'WINDOW',
            'Total terminals:',
            window.TerminalInstanceManager.getInstanceCount?.()
        );
    } catch {
        // ignore
    }
    logger.groupEnd();
    return { term1, term2, term3 };
};

window.demoCreateEditors = function demoCreateEditors() {
    if (!window.TextEditorInstanceManager) return null;
    logger.group('WINDOW', 'Creating Text Editors...');
    const editor1 = window.TextEditorInstanceManager.createInstance?.({
        title: 'README.md',
        initialState: { content: '# My Project\n', filename: 'README.md' },
    });
    const editor2 = window.TextEditorInstanceManager.createInstance?.({
        title: 'notes.txt',
        initialState: { content: 'Notes', filename: 'notes.txt' },
    });
    const editor3 = window.TextEditorInstanceManager.createInstance?.({ title: 'Untitled' });
    try {
        logger.debug(
            'WINDOW',
            'Total editors:',
            window.TextEditorInstanceManager.getInstanceCount?.()
        );
    } catch {
        // ignore
    }
    logger.groupEnd();
    return { editor1, editor2, editor3 };
};

window.demoSaveTerminals = function demoSaveTerminals() {
    if (!window.TerminalInstanceManager) return;
    logger.group('WINDOW', 'Save Terminal State...');
    const terminals = window.demoCreateTerminals?.() as Record<string, unknown> | undefined;
    if (terminals && terminals.term1) {
        const t1 = terminals.term1 as InstanceShape;
        t1.currentPath = '/home';
        t1.commandHistory = ['ls', 'pwd', 'cd documents'];
    }
    const savedState = window.TerminalInstanceManager.serializeAll?.() || [];
    try {
        localStorage.setItem('demo_terminals', JSON.stringify(savedState));
        logger.debug('WINDOW', 'Saved state:', savedState);
    } catch {
        // ignore
    }
    logger.groupEnd();
};

window.demoRestoreTerminals = function demoRestoreTerminals() {
    if (!window.TerminalInstanceManager) return;
    logger.group('WINDOW', 'Restore Terminal State...');
    try {
        window.TerminalInstanceManager.destroyAllInstances?.();
        const savedState = JSON.parse(localStorage.getItem('demo_terminals') || '[]');
        window.TerminalInstanceManager.deserializeAll?.(savedState);
        const restored = window.TerminalInstanceManager.getAllInstances?.() || [];
        logger.debug('WINDOW', `Restored ${restored.length} terminals`);
    } catch (e) {
        logger.warn('WINDOW', 'Restore failed', e);
    }
    logger.groupEnd();
};

// other helpers can be added similarly, keeping runtime guards

/*
 * Multi-Instance Demo Helpers (TypeScript)
 * Ported from js/multi-instance-demo.js — kept as runtime demo helpers exposed on window.
 * NOTE: This is a non-critical convenience module; it mirrors the legacy JS implementation.
 */

export {};

// Note: rely on central type declarations in /types rather than redeclaring Window properties here.
// This file intentionally avoids augmenting `Window` to prevent conflicts during migration.

type TerminalInstance = {
    instanceId?: string;
    currentPath?: string;
    commandHistory?: string[];
    on?: (event: string, cb: (...args: unknown[]) => void) => void;
    updateState?: (u: Record<string, unknown>) => void;
    focus?: () => void;
    blur?: () => void;
    state?: Record<string, unknown>;
};

type TerminalManager = {
    createInstance: (cfg?: Record<string, unknown>) => TerminalInstance | null | undefined;
    getInstanceCount?: () => number;
    serializeAll?: () => unknown;
    destroyAllInstances?: () => void;
    deserializeAll?: (data: unknown) => void;
    getAllInstances?: () => TerminalInstance[];
    getActiveInstance?: () => TerminalInstance | null | undefined;
    setActiveInstance?: (id: string) => void;
};

// EditorInstance shape intentionally omitted during migration to keep demo lightweight.

// EditorManager and demo helper return types are intentionally omitted to reduce churn during migration.

function logDemo(title: string, description: string): void {
    logger.debug('WINDOW', `%c${title}`, 'color: #00aaff; font-weight: bold; font-size: 14px');

    logger.debug('WINDOW', `%c${description}`, 'color: #888; font-size: 12px');
}

// Attach demo helpers to window
(() => {
    // Terminal demos
    logDemo('📟 Terminal Instances', 'Erstelle mehrere Terminal-Instanzen');

    window.demoCreateTerminals = function () {
        logger.group('WINDOW', 'Creating Terminals...');
        const manager = window.TerminalInstanceManager!;
        const term1 = manager.createInstance({ title: 'Terminal 1 - Main' });
        logger.debug('WINDOW', '✓ Terminal 1:', term1?.instanceId);
        const term2 = manager.createInstance({ title: 'Terminal 2 - Dev' });
        logger.debug('WINDOW', '✓ Terminal 2:', term2?.instanceId);
        const term3 = manager.createInstance({ title: 'Terminal 3 - Logs' });
        logger.debug('WINDOW', '✓ Terminal 3:', term3?.instanceId);
        logger.debug('WINDOW', `Total terminals: ${manager.getInstanceCount()}`);
        logger.groupEnd();
        return { term1, term2, term3 } as Record<string, unknown>;
    };

    window.demoTerminalIsolation = function () {
        logger.group('WINDOW', 'Terminal Isolation Demo...');
        const terminals = window.demoCreateTerminals?.() as Record<string, unknown> | undefined;
        if (!terminals) return;
        if (terminals.term1) {
            const t1 = terminals.term1 as TerminalInstance;
            t1.currentPath = '/home/user';
            t1.commandHistory = t1.commandHistory || [];
            t1.commandHistory.push('ls', 'pwd');
        }
        if (terminals.term2) {
            const t2 = terminals.term2 as TerminalInstance;
            t2.currentPath = '/var/log';
            t2.commandHistory = t2.commandHistory || [];
            t2.commandHistory.push('tail -f server.log');
        }
        if (terminals.term3) {
            const t3 = terminals.term3 as TerminalInstance;
            t3.currentPath = '/etc';
            t3.commandHistory = t3.commandHistory || [];
            t3.commandHistory.push('cat config.yaml');
        }
        logger.debug(
            'WINDOW',
            'Terminal 1 path:',
            (terminals.term1 as TerminalInstance | undefined)?.currentPath
        );
        logger.debug(
            'WINDOW',
            'Terminal 1 history:',
            (terminals.term1 as TerminalInstance | undefined)?.commandHistory
        );
        logger.debug(
            'WINDOW',
            'Terminal 2 path:',
            (terminals.term2 as TerminalInstance | undefined)?.currentPath
        );
        logger.debug(
            'WINDOW',
            'Terminal 2 history:',
            (terminals.term2 as TerminalInstance | undefined)?.commandHistory
        );
        logger.debug(
            'WINDOW',
            'Terminal 3 path:',
            (terminals.term3 as TerminalInstance | undefined)?.currentPath
        );
        logger.debug(
            'WINDOW',
            'Terminal 3 history:',
            (terminals.term3 as TerminalInstance | undefined)?.commandHistory
        );
        logger.debug('WINDOW', '%c✓ Alle Terminals haben isolierten State!', 'color: #00ff00');
        logger.groupEnd();
    };

    // Editor demos
    logDemo('📝 Text Editor Instances', 'Erstelle mehrere Editor-Instanzen');

    window.demoCreateEditors = function () {
        logger.group('WINDOW', 'Creating Text Editors...');
        const mgr = window.TextEditorInstanceManager!;
        const editor1 = mgr.createInstance({
            title: 'README.md',
            initialState: {
                content: '# My Project\n\nThis is a test document.',
                filename: 'README.md',
            },
        });
        logger.debug('WINDOW', '✓ Editor 1:', editor1?.instanceId);
        const editor2 = mgr.createInstance({
            title: 'notes.txt',
            initialState: {
                content: 'Meeting notes:\n- Point 1\n- Point 2',
                filename: 'notes.txt',
            },
        });
        logger.debug('WINDOW', '✓ Editor 2:', editor2?.instanceId);
        const editor3 = mgr.createInstance({ title: 'Untitled' });
        logger.debug('WINDOW', '✓ Editor 3:', editor3?.instanceId);
        logger.debug('WINDOW', 'Total editors:', mgr.getInstanceCount());
        logger.groupEnd();
        return { editor1, editor2, editor3 } as Record<string, unknown>;
    };

    window.demoEditorContent = function () {
        logger.group('WINDOW', 'Editor Content Demo...');
        const editors = window.demoCreateEditors?.() as Record<string, unknown> | undefined;
        if (!editors) return;
        logger.debug(
            'WINDOW',
            'Editor 1 content:',
            (editors['editor1'] as InstanceShape | undefined)?.state?.content
        );
        logger.debug(
            'WINDOW',
            'Editor 2 content:',
            (editors['editor2'] as InstanceShape | undefined)?.state?.content
        );
        logger.debug(
            'WINDOW',
            'Editor 3 content:',
            (editors['editor3'] as InstanceShape | undefined)?.state?.content
        );
        logger.debug('WINDOW', '%c✓ Jeder Editor hat eigenen Content!', 'color: #00ff00');
        logger.groupEnd();
    };

    // State persistence demos
    logDemo('💾 State Persistence', 'Speichern und Wiederherstellen von Instanzen');

    window.demoSaveTerminals = function () {
        logger.group('WINDOW', 'Save Terminal State...');
        const terminals = window.demoCreateTerminals?.() as Record<string, unknown> | undefined;
        if (!terminals) return;
        if (terminals.term1) {
            const t1 = terminals.term1 as TerminalInstance;
            t1.currentPath = '/home';
            t1.commandHistory = ['ls', 'pwd', 'cd documents'];
        }
        const mgr = window.TerminalInstanceManager as TerminalManager | undefined;
        const savedState = mgr?.serializeAll ? mgr.serializeAll() : undefined;
        if (typeof savedState !== 'undefined') {
            localStorage.setItem('demo_terminals', JSON.stringify(savedState));
        }
        logger.debug('WINDOW', 'Saved state:', savedState);
        logger.debug('WINDOW', '%c✓ Terminals gespeichert in localStorage!', 'color: #00ff00');
        logger.groupEnd();
    };

    window.demoRestoreTerminals = function () {
        logger.group('WINDOW', 'Restore Terminal State...');
        const mgr = window.TerminalInstanceManager as TerminalManager | undefined;
        mgr?.destroyAllInstances?.();
        logger.debug('WINDOW', 'All instances destroyed');
        const savedState = JSON.parse(localStorage.getItem('demo_terminals') || '[]');
        mgr?.deserializeAll?.(savedState);
        const restored = mgr?.getAllInstances ? mgr.getAllInstances() : [];
        logger.debug('WINDOW', `Restored ${restored.length} terminals`);
        logger.debug('WINDOW', 'First terminal path:', restored[0]?.currentPath);
        logger.debug('WINDOW', 'First terminal history:', restored[0]?.commandHistory);
        logger.debug('WINDOW', '%c✓ Terminals wiederhergestellt!', 'color: #00ff00');
        logger.groupEnd();
    };

    // WindowChrome demo
    logDemo('🎨 WindowChrome Components', 'Wiederverwendbare UI-Komponenten');

    window.demoWindowChrome = function () {
        logger.group('WINDOW', 'WindowChrome Demo...');
        const titlebar = window.WindowChrome?.createTitlebar?.({
            title: 'My Window',
            icon: '💻',
            showClose: true,
            onClose: () => logger.debug('WINDOW', 'Close clicked!'),
        });
        logger.debug('WINDOW', 'Titlebar:', titlebar);
        const toolbar = window.WindowChrome?.createToolbar?.([
            { label: 'New', action: 'new' },
            { type: 'separator' },
            { label: 'Save', action: 'save' },
            { label: 'Open', action: 'open' },
        ]);
        logger.debug('WINDOW', 'Toolbar:', toolbar);
        const statusBar = window.WindowChrome?.createStatusBar?.({
            leftContent: 'Ready',
            rightContent: 'Line 1, Col 1',
        });
        logger.debug('WINDOW', 'StatusBar:', statusBar);
        const frame = window.WindowChrome?.createWindowFrame?.({
            title: 'Complete Window',
            icon: '📝',
            showClose: true,
            showStatusBar: true,
            toolbar: [
                { label: 'File', action: 'file' },
                { label: 'Edit', action: 'edit' },
            ],
        });
        logger.debug('WINDOW', 'Complete Frame:', frame);
        logger.debug('WINDOW', '%c✓ WindowChrome Komponenten erstellt!', 'color: #00ff00');
        logger.groupEnd();
    };

    // Instance manager demos
    logDemo('⚙️ Instance Manager Features', 'Erweiterte Manager-Funktionen');

    window.demoMaxInstances = function () {
        logger.group('WINDOW', 'Max Instances Demo...');
        const limitedManager = window.InstanceManager
            ? new window.InstanceManager({
                  type: 'demo',
                  instanceClass: window.BaseWindowInstance,
                  maxInstances: 2,
              })
            : null;
        if (!limitedManager) {
            logger.warn('WINDOW', 'InstanceManager not available in demo environment');
            return;
        }
        const instance1 = limitedManager.createInstance({ title: 'Instance 1' });
        logger.debug('WINDOW', 'Created:', instance1?.instanceId);
        const instance2 = limitedManager.createInstance({ title: 'Instance 2' });
        logger.debug('WINDOW', 'Created:', instance2?.instanceId);
        const instance3 = limitedManager.createInstance({ title: 'Instance 3' });
        logger.debug('WINDOW', 'Created:', instance3?.instanceId, '(should be null)');
        logger.debug('WINDOW', `Total: ${limitedManager.getInstanceCount()} / 2`);
        logger.debug('WINDOW', '%c✓ Max instances Limit funktioniert!', 'color: #00ff00');
        logger.groupEnd();
    };

    window.demoActiveInstance = function () {
        logger.group('WINDOW', 'Active Instance Tracking...');
        const terminals = window.demoCreateTerminals?.() as Record<string, unknown> | undefined;
        logger.debug(
            'WINDOW',
            'Active instance:',
            window.TerminalInstanceManager?.getActiveInstance?.()?.instanceId
        );
        if (terminals?.term1)
            window.TerminalInstanceManager?.setActiveInstance?.(
                (terminals['term1'] as InstanceShape).instanceId as string
            );
        logger.debug(
            'WINDOW',
            'Switched to:',
            window.TerminalInstanceManager?.getActiveInstance?.()?.instanceId
        );
        if (terminals?.term2)
            window.TerminalInstanceManager?.setActiveInstance?.(
                (terminals['term2'] as InstanceShape).instanceId as string
            );
        logger.debug(
            'WINDOW',
            'Switched to:',
            window.TerminalInstanceManager?.getActiveInstance?.()?.instanceId
        );
        logger.debug('WINDOW', '%c✓ Active instance tracking funktioniert!', 'color: #00ff00');
        logger.groupEnd();
    };

    // Event system demo
    logDemo('📡 Event System', 'Instance Event Handling');

    window.demoEvents = function () {
        logger.group('WINDOW', 'Event System Demo...');
        const terminal = window.TerminalInstanceManager?.createInstance?.({
            title: 'Event Demo Terminal',
        });
        if (!terminal) return;
        terminal.on('stateChanged', (data: unknown) => {
            logger.debug('WINDOW', 'State changed:', (data as Record<string, unknown>).newState);
        });
        terminal.on('focused', () => {
            logger.debug('WINDOW', 'Terminal focused!');
        });
        terminal.on('blurred', () => {
            logger.debug('WINDOW', 'Terminal blurred!');
        });
        terminal.updateState({ foo: 'bar' });
        terminal.focus();
        terminal.blur();
        logger.debug('WINDOW', '%c✓ Event System funktioniert!', 'color: #00ff00');
        logger.groupEnd();
    };

    // Tab system demo
    logDemo('🗂️ Tab System Demo', 'Test the new tab management features');

    window.demoTabs = function () {
        logger.group('WINDOW', 'Tab System Demo...');
        logger.debug('WINDOW', 'Creating 3 terminal instances...');
        window.TerminalInstanceManager?.createInstance?.({ title: 'Terminal 1' });
        window.TerminalInstanceManager?.createInstance?.({ title: 'Terminal 2' });
        window.TerminalInstanceManager?.createInstance?.({ title: 'Terminal 3' });
        logger.debug('WINDOW', '✓ Terminals created');
        logger.groupEnd();
    };

    window.demoSessionSave = function () {
        logger.group('WINDOW', 'Session Save Demo...');
        window.TerminalInstanceManager?.createInstance?.({ title: 'Dev Terminal' });
        window.TerminalInstanceManager?.createInstance?.({ title: 'Test Terminal' });
        window.TextEditorInstanceManager?.createInstance?.({ title: 'notes.txt' });
        logger.debug('WINDOW', 'Saving session...');
        (window.SessionManager as any).saveAllSessions();
        const info = (window.SessionManager as any)?.getStorageInfo();
        logger.debug('WINDOW', '✓ Session saved:', info);
        logger.groupEnd();
    };

    (window as any).demoSessionExport = function () {
        logger.group('WINDOW', 'Session Export Demo...');
        if ((window.TerminalInstanceManager?.getInstanceCount?.() || 0) === 0) {
            window.TerminalInstanceManager?.createInstance?.({ title: 'Terminal 1' });
            window.TerminalInstanceManager?.createInstance?.({ title: 'Terminal 2' });
        }
        const sessionJson = (window.SessionManager as any)?.exportSession?.();
        logger.debug('WINDOW', 'Exported session:', sessionJson);
        logger.groupEnd();
        return sessionJson;
    };

    (window as any).demoKeyboardShortcuts = function () {
        logger.group('WINDOW', 'Keyboard Shortcuts Demo...');
        const shortcuts = (window.KeyboardShortcuts as any)?.getAllShortcuts?.() || [];
        logger.debug('WINDOW', `Registered shortcuts: ${shortcuts.length}`);
        shortcuts.forEach((s: any) => {
            if (s.description) {
                const display = window.KeyboardShortcuts.getShortcutDisplay?.(s);
                logger.debug('WINDOW', `  ${display}: ${s.description}`);
            }
        });
        logger.groupEnd();
    };

    // Quick start message

    logger.debug(
        'WINDOW',
        '\n%c📖 Quick Start:',
        'color: #ffaa00; font-weight: bold; font-size: 16px'
    );
})();
