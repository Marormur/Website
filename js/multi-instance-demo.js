/**
 * Multi-Instance Demo Script
 *
 * Zeigt, wie man das neue Multi-Instance System verwendet.
 * Öffne die Browser-Konsole und führe Beispiele aus!
 */

console.log(
    '%c🚀 Multi-Instance System Demo',
    'color: #00ff00; font-size: 20px; font-weight: bold'
);

// Helper function to log with style
function logDemo(title, description) {
    console.log(`%c${title}`, 'color: #00aaff; font-weight: bold; font-size: 14px');
    console.log(`%c${description}`, 'color: #888; font-size: 12px');
}

// =============================================================================
// TERMINAL INSTANCES
// =============================================================================

logDemo('📟 Terminal Instances', 'Erstelle mehrere Terminal-Instanzen');

window.demoCreateTerminals = function () {
    console.group('Creating Terminals...');

    const term1 = window.TerminalInstanceManager.createInstance({
        title: 'Terminal 1 - Main',
    });
    console.log('✓ Terminal 1:', term1.instanceId);

    const term2 = window.TerminalInstanceManager.createInstance({
        title: 'Terminal 2 - Dev',
    });
    console.log('✓ Terminal 2:', term2.instanceId);

    const term3 = window.TerminalInstanceManager.createInstance({
        title: 'Terminal 3 - Logs',
    });
    console.log('✓ Terminal 3:', term3.instanceId);

    console.log(`Total terminals: ${window.TerminalInstanceManager.getInstanceCount()}`);
    console.groupEnd();

    return { term1, term2, term3 };
};

window.demoTerminalIsolation = function () {
    console.group('Terminal Isolation Demo...');

    const terminals = window.demoCreateTerminals();

    // Jedes Terminal hat seinen eigenen State
    terminals.term1.currentPath = '/home/user';
    terminals.term1.commandHistory.push('ls', 'pwd');

    terminals.term2.currentPath = '/var/log';
    terminals.term2.commandHistory.push('tail -f server.log');

    terminals.term3.currentPath = '/etc';
    terminals.term3.commandHistory.push('cat config.yaml');

    console.log('Terminal 1 path:', terminals.term1.currentPath);
    console.log('Terminal 1 history:', terminals.term1.commandHistory);

    console.log('Terminal 2 path:', terminals.term2.currentPath);
    console.log('Terminal 2 history:', terminals.term2.commandHistory);

    console.log('Terminal 3 path:', terminals.term3.currentPath);
    console.log('Terminal 3 history:', terminals.term3.commandHistory);

    console.log('%c✓ Alle Terminals haben isolierten State!', 'color: #00ff00');
    console.groupEnd();
};

// =============================================================================
// TEXT EDITOR INSTANCES
// =============================================================================

logDemo('📝 Text Editor Instances', 'Erstelle mehrere Editor-Instanzen');

window.demoCreateEditors = function () {
    console.group('Creating Text Editors...');

    const editor1 = window.TextEditorInstanceManager.createInstance({
        title: 'README.md',
        initialState: {
            content: '# My Project\n\nThis is a test document.',
            filename: 'README.md',
        },
    });
    console.log('✓ Editor 1:', editor1.instanceId);

    const editor2 = window.TextEditorInstanceManager.createInstance({
        title: 'notes.txt',
        initialState: {
            content: 'Meeting notes:\n- Point 1\n- Point 2',
            filename: 'notes.txt',
        },
    });
    console.log('✓ Editor 2:', editor2.instanceId);

    const editor3 = window.TextEditorInstanceManager.createInstance({
        title: 'Untitled',
    });
    console.log('✓ Editor 3:', editor3.instanceId);

    console.log(`Total editors: ${window.TextEditorInstanceManager.getInstanceCount()}`);
    console.groupEnd();

    return { editor1, editor2, editor3 };
};

window.demoEditorContent = function () {
    console.group('Editor Content Demo...');

    const editors = window.demoCreateEditors();

    console.log('Editor 1 content:', editors.editor1.state.content);
    console.log('Editor 2 content:', editors.editor2.state.content);
    console.log('Editor 3 content:', editors.editor3.state.content);

    console.log('%c✓ Jeder Editor hat eigenen Content!', 'color: #00ff00');
    console.groupEnd();
};

// =============================================================================
// STATE PERSISTENCE
// =============================================================================

logDemo('💾 State Persistence', 'Speichern und Wiederherstellen von Instanzen');

window.demoSaveTerminals = function () {
    console.group('Save Terminal State...');

    // Erstelle Terminals mit State
    const terminals = window.demoCreateTerminals();
    terminals.term1.currentPath = '/home';
    terminals.term1.commandHistory = ['ls', 'pwd', 'cd documents'];

    // Speichern
    const savedState = window.TerminalInstanceManager.serializeAll();
    localStorage.setItem('demo_terminals', JSON.stringify(savedState));

    console.log('Saved state:', savedState);
    console.log('%c✓ Terminals gespeichert in localStorage!', 'color: #00ff00');
    console.groupEnd();
};

window.demoRestoreTerminals = function () {
    console.group('Restore Terminal State...');

    // Alle Instanzen löschen
    window.TerminalInstanceManager.destroyAllInstances();
    console.log('All instances destroyed');

    // Aus localStorage wiederherstellen
    const savedState = JSON.parse(localStorage.getItem('demo_terminals') || '[]');
    window.TerminalInstanceManager.deserializeAll(savedState);

    const restored = window.TerminalInstanceManager.getAllInstances();
    console.log(`Restored ${restored.length} terminals`);
    console.log('First terminal path:', restored[0]?.currentPath);
    console.log('First terminal history:', restored[0]?.commandHistory);

    console.log('%c✓ Terminals wiederhergestellt!', 'color: #00ff00');
    console.groupEnd();
};

// =============================================================================
// WINDOW CHROME
// =============================================================================

logDemo('🎨 WindowChrome Components', 'Wiederverwendbare UI-Komponenten');

window.demoWindowChrome = function () {
    console.group('WindowChrome Demo...');

    // Titlebar
    const titlebar = window.WindowChrome.createTitlebar({
        title: 'My Window',
        icon: '💻',
        showClose: true,
        onClose: () => console.log('Close clicked!'),
    });
    console.log('Titlebar:', titlebar);

    // Toolbar
    const toolbar = window.WindowChrome.createToolbar([
        { label: 'New', action: 'new' },
        { type: 'separator' },
        { label: 'Save', action: 'save' },
        { label: 'Open', action: 'open' },
    ]);
    console.log('Toolbar:', toolbar);

    // Status Bar
    const statusBar = window.WindowChrome.createStatusBar({
        leftContent: 'Ready',
        rightContent: 'Line 1, Col 1',
    });
    console.log('StatusBar:', statusBar);

    // Complete Frame
    const frame = window.WindowChrome.createWindowFrame({
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

// =============================================================================
// INSTANCE MANAGER FEATURES
// =============================================================================

logDemo('⚙️ Instance Manager Features', 'Erweiterte Manager-Funktionen');

window.demoMaxInstances = function () {
    console.group('Max Instances Demo...');

    // Erstelle einen Manager mit Limit
    const limitedManager = new window.InstanceManager({
        type: 'demo',
        instanceClass: window.BaseWindowInstance,
        maxInstances: 2,
    });

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

    const terminals = window.demoCreateTerminals();

    console.log('Active instance:', window.TerminalInstanceManager.getActiveInstance()?.instanceId);

    // Wechsle active instance
    window.TerminalInstanceManager.setActiveInstance(terminals.term1.instanceId);
    console.log('Switched to:', window.TerminalInstanceManager.getActiveInstance()?.instanceId);

    window.TerminalInstanceManager.setActiveInstance(terminals.term2.instanceId);
    console.log('Switched to:', window.TerminalInstanceManager.getActiveInstance()?.instanceId);

    console.log('%c✓ Active instance tracking funktioniert!', 'color: #00ff00');
    console.groupEnd();
};

// =============================================================================
// EVENT SYSTEM
// =============================================================================

logDemo('📡 Event System', 'Instance Event Handling');

window.demoEvents = function () {
    console.group('Event System Demo...');

    const terminal = window.TerminalInstanceManager.createInstance({
        title: 'Event Demo Terminal',
    });

    // Event Listener hinzufügen
    terminal.on('stateChanged', data => {
        console.log('State changed:', data.newState);
    });

    terminal.on('focused', () => {
        console.log('Terminal focused!');
    });

    terminal.on('blurred', () => {
        console.log('Terminal blurred!');
    });

    // Events auslösen
    terminal.updateState({ foo: 'bar' });
    terminal.focus();
    terminal.blur();

    console.log('%c✓ Event System funktioniert!', 'color: #00ff00');
    console.groupEnd();
};

// =============================================================================
// NEW TAB SYSTEM DEMOS
// =============================================================================

logDemo('🗂️ Tab System Demo', 'Test the new tab management features');

window.demoTabs = function () {
    console.group('Tab System Demo...');

    // Create multiple terminal instances
    console.log('Creating 3 terminal instances...');
    const term1 = window.TerminalInstanceManager.createInstance({
        title: 'Terminal 1',
    });
    const term2 = window.TerminalInstanceManager.createInstance({
        title: 'Terminal 2',
    });
    const term3 = window.TerminalInstanceManager.createInstance({
        title: 'Terminal 3',
    });

    console.log('✓ Terminals created');
    console.log('✓ Check the tab bar in the terminal modal for tabs');
    console.log('✓ Try keyboard shortcuts:');
    console.log('  - Cmd/Ctrl+N: New terminal');
    console.log('  - Cmd/Ctrl+W: Close terminal');
    console.log('  - Cmd/Ctrl+Tab: Next tab');
    console.log('  - Cmd/Ctrl+1-3: Jump to specific tab');

    console.groupEnd();
};

window.demoSessionSave = function () {
    console.group('Session Save Demo...');

    // Create some instances
    console.log('Creating instances...');
    window.TerminalInstanceManager.createInstance({ title: 'Dev Terminal' });
    window.TerminalInstanceManager.createInstance({ title: 'Test Terminal' });
    window.TextEditorInstanceManager.createInstance({ title: 'notes.txt' });

    // Save session
    console.log('Saving session...');
    window.SessionManager.saveAllSessions();

    const info = window.SessionManager.getStorageInfo();
    console.log('✓ Session saved:', info);
    console.log('✓ Refresh the page to see auto-restore in action!');

    console.groupEnd();
};

window.demoSessionExport = function () {
    console.group('Session Export Demo...');

    // Create some instances if none exist
    if (window.TerminalInstanceManager.getInstanceCount() === 0) {
        window.TerminalInstanceManager.createInstance({ title: 'Terminal 1' });
        window.TerminalInstanceManager.createInstance({ title: 'Terminal 2' });
    }

    // Export session
    const sessionJson = window.SessionManager.exportSession();
    console.log('Exported session:', sessionJson);
    console.log('✓ You can save this JSON and import it later');

    console.groupEnd();
    return sessionJson;
};

window.demoKeyboardShortcuts = function () {
    console.group('Keyboard Shortcuts Demo...');

    const shortcuts = window.KeyboardShortcuts.getAllShortcuts();
    console.log(`Registered shortcuts: ${shortcuts.length}`);

    console.log('\n📋 Available shortcuts:');
    shortcuts.forEach(s => {
        if (s.description) {
            const display = window.KeyboardShortcuts.getShortcutDisplay(s);
            console.log(`  ${display}: ${s.description}`);
        }
    });

    console.groupEnd();
};

// =============================================================================
// QUICK START
// =============================================================================

console.log('\n%c📖 Quick Start:', 'color: #ffaa00; font-weight: bold; font-size: 16px');
console.log('%cProbiere diese Funktionen aus:', 'color: #888; font-size: 12px');
console.log('%c  demoCreateTerminals()', 'color: #00aaff; font-family: monospace');
console.log('%c  demoTerminalIsolation()', 'color: #00aaff; font-family: monospace');
console.log('%c  demoCreateEditors()', 'color: #00aaff; font-family: monospace');
console.log('%c  demoEditorContent()', 'color: #00aaff; font-family: monospace');
console.log('%c  demoSaveTerminals()', 'color: #00aaff; font-family: monospace');
console.log('%c  demoRestoreTerminals()', 'color: #00aaff; font-family: monospace');
console.log('%c  demoWindowChrome()', 'color: #00aaff; font-family: monospace');
console.log('%c  demoMaxInstances()', 'color: #00aaff; font-family: monospace');
console.log('%c  demoActiveInstance()', 'color: #00aaff; font-family: monospace');
console.log('%c  demoEvents()', 'color: #00aaff; font-family: monospace');

console.log('\n%c🆕 New Tab System Demos:', 'color: #00ff00; font-weight: bold; font-size: 14px');
console.log('%c  demoTabs()', 'color: #00aaff; font-family: monospace');
console.log('%c  demoSessionSave()', 'color: #00aaff; font-family: monospace');
console.log('%c  demoSessionExport()', 'color: #00aaff; font-family: monospace');
console.log('%c  demoKeyboardShortcuts()', 'color: #00aaff; font-family: monospace');

console.log('\n%c💡 Tipp:', 'color: #ffaa00; font-weight: bold');
console.log('%cAlle Demo-Funktionen sind als window.demo* verfügbar', 'color: #888');

// Auto-run demo on load (optional)
if (window.location.search.includes('demo=true')) {
    console.log('\n%c🎬 Running all demos...', 'color: #ff00ff; font-weight: bold');
    setTimeout(() => {
        demoCreateTerminals();
        demoTerminalIsolation();
        demoCreateEditors();
        demoEditorContent();
        demoWindowChrome();
        demoMaxInstances();
        demoActiveInstance();
        demoEvents();
    }, 1000);
}
