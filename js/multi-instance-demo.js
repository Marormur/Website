/* EXPORTS STUB FOR BROWSER */
var exports = {};
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Helper to safely access window managers with casts
const W = window;
W.demoCreateTerminals = function demoCreateTerminals() {
    if (!W.TerminalInstanceManager)
        return null;
    console.group('Creating Terminals...');
    const term1 = W.TerminalInstanceManager.createInstance?.({ title: 'Terminal 1 - Main' });
    const term2 = W.TerminalInstanceManager.createInstance?.({ title: 'Terminal 2 - Dev' });
    const term3 = W.TerminalInstanceManager.createInstance?.({ title: 'Terminal 3 - Logs' });
    try {
        console.log('Total terminals:', W.TerminalInstanceManager.getInstanceCount?.());
    }
    catch {
        // ignore
    }
    console.groupEnd();
    return { term1, term2, term3 };
};
W.demoCreateEditors = function demoCreateEditors() {
    if (!W.TextEditorInstanceManager)
        return null;
    console.group('Creating Text Editors...');
    const editor1 = W.TextEditorInstanceManager.createInstance?.({
        title: 'README.md',
        initialState: { content: '# My Project\n', filename: 'README.md' },
    });
    const editor2 = W.TextEditorInstanceManager.createInstance?.({
        title: 'notes.txt',
        initialState: { content: 'Notes', filename: 'notes.txt' },
    });
    const editor3 = W.TextEditorInstanceManager.createInstance?.({ title: 'Untitled' });
    try {
        console.log('Total editors:', W.TextEditorInstanceManager.getInstanceCount?.());
    }
    catch {
        // ignore
    }
    console.groupEnd();
    return { editor1, editor2, editor3 };
};
W.demoSaveTerminals = function demoSaveTerminals() {
    if (!W.TerminalInstanceManager)
        return;
    console.group('Save Terminal State...');
    const terminals = W.demoCreateTerminals?.();
    if (terminals && terminals.term1) {
        terminals.term1.currentPath = '/home';
        terminals.term1.commandHistory = ['ls', 'pwd', 'cd documents'];
    }
    const savedState = W.TerminalInstanceManager.serializeAll?.() || [];
    try {
        localStorage.setItem('demo_terminals', JSON.stringify(savedState));
        console.log('Saved state:', savedState);
    }
    catch {
        // ignore
    }
    console.groupEnd();
};
W.demoRestoreTerminals = function demoRestoreTerminals() {
    if (!W.TerminalInstanceManager)
        return;
    console.group('Restore Terminal State...');
    try {
        W.TerminalInstanceManager.destroyAllInstances?.();
        const savedState = JSON.parse(localStorage.getItem('demo_terminals') || '[]');
        W.TerminalInstanceManager.deserializeAll?.(savedState);
        const restored = W.TerminalInstanceManager.getAllInstances?.() || [];
        console.log(`Restored ${restored.length} terminals`);
    }
    catch (e) {
        console.warn('Restore failed', e);
    }
    console.groupEnd();
};
// EditorInstance shape intentionally omitted during migration to keep demo lightweight.
// EditorManager and demo helper return types are intentionally omitted to reduce churn during migration.
function logDemo(title, description) {
    console.log(`%c${title}`, 'color: #00aaff; font-weight: bold; font-size: 14px');
    console.log(`%c${description}`, 'color: #888; font-size: 12px');
}
// Attach demo helpers to window
(() => {
    // Terminal demos
    logDemo('📟 Terminal Instances', 'Erstelle mehrere Terminal-Instanzen');
    window.demoCreateTerminals = function () {
        console.group('Creating Terminals...');
        const manager = window.TerminalInstanceManager;
        const term1 = manager.createInstance({ title: 'Terminal 1 - Main' });
        console.log('✓ Terminal 1:', term1?.instanceId);
        const term2 = manager.createInstance({ title: 'Terminal 2 - Dev' });
        console.log('✓ Terminal 2:', term2?.instanceId);
        const term3 = manager.createInstance({ title: 'Terminal 3 - Logs' });
        console.log('✓ Terminal 3:', term3?.instanceId);
        console.log(`Total terminals: ${manager.getInstanceCount()}`);
        console.groupEnd();
        return { term1, term2, term3 };
    };
    window.demoTerminalIsolation = function () {
        console.group('Terminal Isolation Demo...');
        const terminals = window.demoCreateTerminals?.();
        if (!terminals)
            return;
        if (terminals.term1) {
            terminals.term1.currentPath = '/home/user';
            terminals.term1.commandHistory = terminals.term1.commandHistory || [];
            terminals.term1.commandHistory.push('ls', 'pwd');
        }
        if (terminals.term2) {
            terminals.term2.currentPath = '/var/log';
            terminals.term2.commandHistory = terminals.term2.commandHistory || [];
            terminals.term2.commandHistory.push('tail -f server.log');
        }
        if (terminals.term3) {
            terminals.term3.currentPath = '/etc';
            terminals.term3.commandHistory = terminals.term3.commandHistory || [];
            terminals.term3.commandHistory.push('cat config.yaml');
        }
        console.log('Terminal 1 path:', terminals.term1?.currentPath);
        console.log('Terminal 1 history:', terminals.term1?.commandHistory);
        console.log('Terminal 2 path:', terminals.term2?.currentPath);
        console.log('Terminal 2 history:', terminals.term2?.commandHistory);
        console.log('Terminal 3 path:', terminals.term3?.currentPath);
        console.log('Terminal 3 history:', terminals.term3?.commandHistory);
        console.log('%c✓ Alle Terminals haben isolierten State!', 'color: #00ff00');
        console.groupEnd();
    };
    // Editor demos
    logDemo('📝 Text Editor Instances', 'Erstelle mehrere Editor-Instanzen');
    window.demoCreateEditors = function () {
        console.group('Creating Text Editors...');
        const mgr = window.TextEditorInstanceManager;
        const editor1 = mgr.createInstance({
            title: 'README.md',
            initialState: {
                content: '# My Project\n\nThis is a test document.',
                filename: 'README.md',
            },
        });
        console.log('✓ Editor 1:', editor1?.instanceId);
        const editor2 = mgr.createInstance({
            title: 'notes.txt',
            initialState: {
                content: 'Meeting notes:\n- Point 1\n- Point 2',
                filename: 'notes.txt',
            },
        });
        console.log('✓ Editor 2:', editor2?.instanceId);
        const editor3 = mgr.createInstance({ title: 'Untitled' });
        console.log('✓ Editor 3:', editor3?.instanceId);
        console.log('Total editors:', mgr.getInstanceCount());
        console.groupEnd();
        return { editor1, editor2, editor3 };
    };
    window.demoEditorContent = function () {
        console.group('Editor Content Demo...');
        const editors = window.demoCreateEditors?.();
        if (!editors)
            return;
        console.log('Editor 1 content:', editors.editor1?.state?.content);
        console.log('Editor 2 content:', editors.editor2?.state?.content);
        console.log('Editor 3 content:', editors.editor3?.state?.content);
        console.log('%c✓ Jeder Editor hat eigenen Content!', 'color: #00ff00');
        console.groupEnd();
    };
    // State persistence demos
    logDemo('💾 State Persistence', 'Speichern und Wiederherstellen von Instanzen');
    window.demoSaveTerminals = function () {
        console.group('Save Terminal State...');
        const terminals = window.demoCreateTerminals?.();
        if (!terminals)
            return;
        if (terminals.term1) {
            terminals.term1.currentPath = '/home';
            terminals.term1.commandHistory = ['ls', 'pwd', 'cd documents'];
        }
        const mgr = window.TerminalInstanceManager;
        const savedState = mgr?.serializeAll ? mgr.serializeAll() : undefined;
        if (typeof savedState !== 'undefined') {
            localStorage.setItem('demo_terminals', JSON.stringify(savedState));
        }
        console.log('Saved state:', savedState);
        console.log('%c✓ Terminals gespeichert in localStorage!', 'color: #00ff00');
        console.groupEnd();
    };
    window.demoRestoreTerminals = function () {
        console.group('Restore Terminal State...');
        const mgr = window.TerminalInstanceManager;
        mgr?.destroyAllInstances?.();
        console.log('All instances destroyed');
        const savedState = JSON.parse(localStorage.getItem('demo_terminals') || '[]');
        mgr?.deserializeAll?.(savedState);
        const restored = mgr?.getAllInstances ? mgr.getAllInstances() : [];
        console.log(`Restored ${restored.length} terminals`);
        console.log('First terminal path:', restored[0]?.currentPath);
        console.log('First terminal history:', restored[0]?.commandHistory);
        console.log('%c✓ Terminals wiederhergestellt!', 'color: #00ff00');
        console.groupEnd();
    };
    // WindowChrome demo
    logDemo('🎨 WindowChrome Components', 'Wiederverwendbare UI-Komponenten');
    window.demoWindowChrome = function () {
        console.group('WindowChrome Demo...');
        const titlebar = window.WindowChrome?.createTitlebar?.({
            title: 'My Window',
            icon: '💻',
            showClose: true,
            onClose: () => console.log('Close clicked!'),
        });
        console.log('Titlebar:', titlebar);
        const toolbar = window.WindowChrome?.createToolbar?.([
            { label: 'New', action: 'new' },
            { type: 'separator' },
            { label: 'Save', action: 'save' },
            { label: 'Open', action: 'open' },
        ]);
        console.log('Toolbar:', toolbar);
        const statusBar = window.WindowChrome?.createStatusBar?.({
            leftContent: 'Ready',
            rightContent: 'Line 1, Col 1',
        });
        console.log('StatusBar:', statusBar);
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
        console.log('Complete Frame:', frame);
        console.log('%c✓ WindowChrome Komponenten erstellt!', 'color: #00ff00');
        console.groupEnd();
    };
    // Instance manager demos
    logDemo('⚙️ Instance Manager Features', 'Erweiterte Manager-Funktionen');
    window.demoMaxInstances = function () {
        console.group('Max Instances Demo...');
        const limitedManager = window.InstanceManager
            ? new window.InstanceManager({
                type: 'demo',
                instanceClass: window.BaseWindowInstance,
                maxInstances: 2,
            })
            : null;
        if (!limitedManager) {
            console.warn('InstanceManager not available in demo environment');
            return;
        }
        const instance1 = limitedManager.createInstance({ title: 'Instance 1' });
        console.log('Created:', instance1?.instanceId);
        const instance2 = limitedManager.createInstance({ title: 'Instance 2' });
        console.log('Created:', instance2?.instanceId);
        const instance3 = limitedManager.createInstance({ title: 'Instance 3' });
        console.log('Created:', instance3?.instanceId, '(should be null)');
        console.log(`Total: ${limitedManager.getInstanceCount()} / 2`);
        console.log('%c✓ Max instances Limit funktioniert!', 'color: #00ff00');
        console.groupEnd();
    };
    window.demoActiveInstance = function () {
        console.group('Active Instance Tracking...');
        const terminals = window.demoCreateTerminals?.();
        console.log('Active instance:', window.TerminalInstanceManager?.getActiveInstance?.()?.instanceId);
        if (terminals?.term1)
            window.TerminalInstanceManager?.setActiveInstance?.(terminals.term1.instanceId);
        console.log('Switched to:', window.TerminalInstanceManager?.getActiveInstance?.()?.instanceId);
        if (terminals?.term2)
            window.TerminalInstanceManager?.setActiveInstance?.(terminals.term2.instanceId);
        console.log('Switched to:', window.TerminalInstanceManager?.getActiveInstance?.()?.instanceId);
        console.log('%c✓ Active instance tracking funktioniert!', 'color: #00ff00');
        console.groupEnd();
    };
    // Event system demo
    logDemo('📡 Event System', 'Instance Event Handling');
    window.demoEvents = function () {
        console.group('Event System Demo...');
        const terminal = window.TerminalInstanceManager?.createInstance?.({
            title: 'Event Demo Terminal',
        });
        if (!terminal)
            return;
        terminal.on('stateChanged', (data) => {
            console.log('State changed:', data.newState);
        });
        terminal.on('focused', () => {
            console.log('Terminal focused!');
        });
        terminal.on('blurred', () => {
            console.log('Terminal blurred!');
        });
        terminal.updateState({ foo: 'bar' });
        terminal.focus();
        terminal.blur();
        console.log('%c✓ Event System funktioniert!', 'color: #00ff00');
        console.groupEnd();
    };
    // Tab system demo
    logDemo('🗂️ Tab System Demo', 'Test the new tab management features');
    window.demoTabs = function () {
        console.group('Tab System Demo...');
        console.log('Creating 3 terminal instances...');
        window.TerminalInstanceManager?.createInstance?.({ title: 'Terminal 1' });
        window.TerminalInstanceManager?.createInstance?.({ title: 'Terminal 2' });
        window.TerminalInstanceManager?.createInstance?.({ title: 'Terminal 3' });
        console.log('✓ Terminals created');
        console.groupEnd();
    };
    window.demoSessionSave = function () {
        console.group('Session Save Demo...');
        window.TerminalInstanceManager?.createInstance?.({ title: 'Dev Terminal' });
        window.TerminalInstanceManager?.createInstance?.({ title: 'Test Terminal' });
        window.TextEditorInstanceManager?.createInstance?.({ title: 'notes.txt' });
        console.log('Saving session...');
        window.SessionManager.saveAllSessions();
        const info = window.SessionManager.getStorageInfo();
        console.log('✓ Session saved:', info);
        console.groupEnd();
    };
    window.demoSessionExport = function () {
        console.group('Session Export Demo...');
        if ((window.TerminalInstanceManager?.getInstanceCount?.() || 0) === 0) {
            window.TerminalInstanceManager?.createInstance?.({ title: 'Terminal 1' });
            window.TerminalInstanceManager?.createInstance?.({ title: 'Terminal 2' });
        }
        const sessionJson = window.SessionManager?.exportSession?.();
        console.log('Exported session:', sessionJson);
        console.groupEnd();
        return sessionJson;
    };
    window.demoKeyboardShortcuts = function () {
        console.group('Keyboard Shortcuts Demo...');
        const shortcuts = window.KeyboardShortcuts.getAllShortcuts?.() || [];
        console.log(`Registered shortcuts: ${shortcuts.length}`);
        shortcuts.forEach((s) => {
            if (s.description) {
                const display = window.KeyboardShortcuts.getShortcutDisplay?.(s);
                console.log(`  ${display}: ${s.description}`);
            }
        });
        console.groupEnd();
    };
    // Quick start message
    console.log('\n%c📖 Quick Start:', 'color: #ffaa00; font-weight: bold; font-size: 16px');
})();
//# sourceMappingURL=multi-instance-demo.js.map