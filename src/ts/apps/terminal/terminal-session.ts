/**
 * src/ts/terminal-session.ts
 * Terminal session as a tab within a terminal window
 *
 * Uses the shared VirtualFS for file system operations.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseTab, type TabConfig } from '../../windows/base-tab.js';
import { VirtualFS } from '../../services/virtual-fs.js';

/**
 * TerminalSession - Individual terminal session tab
 *
 * Features:
 * - Command execution with VirtualFS integration
 * - Shared file system with Finder
 * - Command history
 * - Path resolution and navigation
 */
export class TerminalSession extends BaseTab {
    outputElement: HTMLElement | null;
    inputElement: HTMLInputElement | null;
    commandHistory: string[];
    historyIndex: number;
    vfsCwd: string;

    constructor(config?: Partial<TabConfig>) {
        super({
            type: 'terminal-session',
            title: config?.title || 'Terminal',
            ...config,
        });

        this.outputElement = null;
        this.inputElement = null;
        this.commandHistory = [];
        this.historyIndex = -1;
        this.vfsCwd = '/home/marvin';
    }

    /**
     * Create terminal DOM
     */
    createDOM(): HTMLElement {
        const container = document.createElement('div');
        container.id = `${this.id}-container`;
        container.className = 'tab-content hidden w-full h-full';

        const html = `
            <div class="terminal-wrapper h-full flex flex-col bg-gray-900 text-green-400 font-mono text-sm">
                <div class="terminal-output flex-1 overflow-y-auto p-4 space-y-1" data-terminal-output>
                </div>
                <div class="terminal-input-line flex items-center px-4 py-2 border-t border-gray-700">
                    <span class="terminal-prompt text-blue-400">guest@marvin:${this.vfsCwd}$</span>
                    <input
                        type="text"
                        class="flex-1 ml-2 bg-transparent outline-none text-green-400 terminal-input"
                        autocomplete="off"
                        spellcheck="false"
                        aria-label="Terminal input"
                        data-terminal-input
                    />
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.element = container;

        this.outputElement = container.querySelector('[data-terminal-output]');
        this.inputElement = container.querySelector('[data-terminal-input]');

        this._attachEventListeners();
        this.showWelcomeMessage();

        return container;
    }

    private _attachEventListeners(): void {
        if (!this.inputElement) return;

        this.inputElement.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const command = this.inputElement!.value.trim();
                if (command) {
                    this.executeCommand(command);
                    // Note: commandHistory is now updated in executeCommand()
                }
                this.inputElement!.value = '';
                this.inputElement!.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    const historyEntry = this.commandHistory[this.historyIndex];
                    if (historyEntry !== undefined) {
                        this.inputElement!.value = historyEntry;
                    }
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIndex < this.commandHistory.length - 1) {
                    this.historyIndex++;
                    const historyEntry = this.commandHistory[this.historyIndex];
                    if (historyEntry !== undefined) {
                        this.inputElement!.value = historyEntry;
                    }
                } else {
                    this.historyIndex = this.commandHistory.length;
                    this.inputElement!.value = '';
                }
            } else if (e.key === 'Tab') {
                // Keep focus and prevent browser focus traversal.
                e.preventDefault();
                this.handleTabCompletion();
            }
        });
    }

    /**
     * Basic tab completion for commands and VirtualFS paths.
     *
     * This is primarily used by Playwright E2E tests (tests/e2e/terminal/terminal-autocomplete.spec.js)
     * and intentionally stays simple:
     * - Completes first token as command
     * - Completes first argument for cd/cat/mkdir/rm
     */
    private handleTabCompletion(): void {
        if (!this.inputElement) return;

        const input = this.inputElement.value;
        if (input === '') return;

        const endsWithSpace = input.endsWith(' ');
        const tokens = input.split(' ').filter((t, i, arr) => {
            // Preserve a single empty arg at the end via endsWithSpace; otherwise ignore extra spaces.
            if (t !== '') return true;
            return i === arr.length - 1;
        });

        const cmd = tokens[0] ?? '';
        const arg1 = tokens[1] ?? '';

        // Keep in sync with executeCommand() keys.
        const availableCommands = [
            'help',
            'clear',
            'ls',
            'pwd',
            'cd',
            'cat',
            'touch',
            'mkdir',
            'rm',
            'echo',
            'date',
            'whoami',
        ];

        // Command completion (first token).
        if (tokens.length <= 1 && !endsWithSpace) {
            const matches = availableCommands.filter(c => c.startsWith(cmd));
            if (matches.length === 1) {
                const match = matches[0];
                if (match !== undefined) this.inputElement.value = match + ' ';
                return;
            }

            // If already complete command, add a trailing space.
            if (availableCommands.includes(cmd)) {
                this.inputElement.value = cmd + ' ';
            }
            return;
        }

        // Argument completion (first argument only).
        // If user just typed a full command and pressed Tab, add a space.
        if (tokens.length === 1 && endsWithSpace && availableCommands.includes(cmd)) {
            this.inputElement.value = cmd + ' ';
            return;
        }

        // Only complete for supported commands.
        const completeForCmd = cmd === 'cd' || cmd === 'cat' || cmd === 'mkdir' || cmd === 'rm';
        if (!completeForCmd) return;

        // If user hasn't started typing an argument yet, don't change anything.
        if (arg1 === '') return;

        // mkdir: if argument ends with '/', the tests just expect it to stay stable.
        if (cmd === 'mkdir' && arg1.endsWith('/')) return;

        const allowFolders = cmd === 'cd' || cmd === 'mkdir';
        const allowFiles = cmd === 'cat' || cmd === 'rm';
        const allowBoth = cmd === 'rm';

        this.completePathArgument(cmd, arg1, {
            allowFolders: allowBoth ? true : allowFolders,
            allowFiles: allowBoth ? true : allowFiles,
        });
    }

    private findCommonPrefix(strings: string[]): string {
        if (strings.length === 0) return '';
        const first = strings[0];
        if (strings.length === 1) return first;

        let prefix = first;
        for (let i = 1; i < strings.length; i++) {
            const cur = strings[i];
            if (cur === undefined) continue;
            while (cur.indexOf(prefix) !== 0) {
                prefix = prefix.slice(0, -1);
                if (prefix === '') return '';
            }
        }
        return prefix;
    }

    private completePathArgument(
        cmd: 'cd' | 'cat' | 'mkdir' | 'rm',
        rawArg: string,
        opts: { allowFolders: boolean; allowFiles: boolean }
    ): void {
        if (!this.inputElement) return;

        // Split into directory part + basename part (to complete last segment).
        const lastSlashIdx = rawArg.lastIndexOf('/');
        const dirPrefix = lastSlashIdx >= 0 ? rawArg.slice(0, lastSlashIdx + 1) : '';
        const basePrefix = lastSlashIdx >= 0 ? rawArg.slice(lastSlashIdx + 1) : rawArg;

        // If the user is already inside a directory path (ends with '/'), keep stable.
        if (basePrefix === '' && rawArg.endsWith('/')) return;

        const dirForResolve =
            dirPrefix === ''
                ? this.vfsCwd
                : this.vfsResolve(dirPrefix.endsWith('/') ? dirPrefix.slice(0, -1) : dirPrefix);

        const folder = VirtualFS.getFolder(dirForResolve);
        if (!folder) return;

        const entries = Object.entries(folder.children);
        const matches = entries
            .filter(([name, item]) => {
                if (!name.startsWith(basePrefix)) return false;
                if (item.type === 'folder') return opts.allowFolders;
                return opts.allowFiles;
            })
            .map(([name, item]) => ({ name, item }));

        if (matches.length === 0) return;

        const names = matches.map(m => m.name);

        if (matches.length === 1) {
            const m = matches[0];
            let completed = m.name;

            // For `cd`, append '/' to folders.
            if (cmd === 'cd' && m.item.type === 'folder' && !completed.endsWith('/')) {
                completed += '/';
            }

            this.inputElement.value = `${cmd} ${dirPrefix}${completed}`;
            return;
        }

        // Multiple matches: extend to common prefix if possible.
        const common = this.findCommonPrefix(names);
        if (common.length > basePrefix.length) {
            this.inputElement.value = `${cmd} ${dirPrefix}${common}`;
        }
    }

    showWelcomeMessage(): void {
        this.addOutput('Willkommen im Terminal! Gib "help" ein für verfügbare Befehle.', 'info');
    }

    executeCommand(command: string): void {
        this.addOutput(`guest@marvin:${this.vfsCwd}$ ${command}`, 'command');
        const [cmd, ...args] = command.split(' ');

        if (cmd === undefined) return;

        const commands: Record<string, () => void> = {
            help: () => this.showHelp(),
            clear: () => this.clearOutput(),
            ls: () => this.listDirectory(args[0]),
            pwd: () => this.printWorkingDirectory(),
            cd: () => this.changeDirectory(args[0]),
            cat: () => this.catFile(args[0]),
            touch: () => this.touch(args[0]),
            mkdir: () => this.mkdir(args[0]),
            rm: () => this.rm(args[0]),
            echo: () => this.echo(args.join(' ')),
            date: () => this.showDate(),
            whoami: () => this.addOutput('guest', 'output'),
        };

        const commandFn = commands[cmd];
        if (commandFn !== undefined) {
            commandFn();
        } else {
            this.addOutput(
                `Befehl nicht gefunden: ${cmd}. Gib "help" ein für verfügbare Befehle.`,
                'error'
            );
        }

        // Add command to history for session persistence
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;
        this.updateContentState({ commandHistory: this.commandHistory });
    }

    addOutput(text: string, type: 'command' | 'output' | 'error' | 'info' = 'output'): void {
        if (!this.outputElement) return;
        const line = document.createElement('div');
        line.className = `terminal-line terminal-${type}`;
        const colorMap: Record<string, string> = {
            command: 'text-blue-400',
            output: 'text-green-400',
            error: 'text-red-400',
            info: 'text-yellow-400',
        };
        line.className += ` ${colorMap[type] || 'text-green-400'}`;
        line.textContent = text;
        this.outputElement.appendChild(line);
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }

    clearOutput(): void {
        if (this.outputElement) this.outputElement.innerHTML = '';
    }

    showHelp(): void {
        const helpText = [
            'Verfügbare Befehle:',
            '  help     - Zeige diese Hilfe',
            '  clear    - Lösche Ausgabe',
            '  ls       - Liste Dateien',
            '  pwd      - Zeige aktuelles Verzeichnis',
            '  cd <dir> - Wechsle Verzeichnis',
            '  cat <f>  - Zeige Dateiinhalt',
            '  touch <f> - Erstelle leere Datei',
            '  mkdir <d> - Erstelle Verzeichnis',
            '  rm <p>    - Lösche Datei/Verzeichnis',
            '  echo <t> - Gebe Text aus',
            '  date     - Zeige Datum/Zeit',
            '  whoami   - Zeige Benutzername',
        ];
        helpText.forEach(l => this.addOutput(l, 'info'));
    }

    listDirectory(path?: string): void {
        const target = this.vfsResolve(path);
        const item = VirtualFS.get(target);
        if (!item) {
            this.addOutput(`Verzeichnis/Datei nicht gefunden: ${path || target}`, 'error');
            return;
        }
        if (item.type === 'file') {
            this.addOutput('📄 ' + target.split('/').pop(), 'output');
            return;
        }
        const entries = VirtualFS.list(target);
        const names = Object.keys(entries);
        if (names.length === 0) {
            this.addOutput('(leer)', 'output');
            return;
        }
        names.forEach(name => {
            const child = entries[name];
            if (child) {
                const prefix = child.type === 'folder' ? '📁 ' : '📄 ';
                this.addOutput(prefix + name, 'output');
            }
        });
    }

    printWorkingDirectory(): void {
        this.addOutput(this.vfsCwd, 'output');
    }

    changeDirectory(path?: string): void {
        const target = this.vfsResolve(path || '/home/marvin');
        const folder = VirtualFS.getFolder(target);
        if (!folder) {
            this.addOutput(`Verzeichnis nicht gefunden: ${path || target}`, 'error');
            return;
        }
        this.vfsCwd = target;
        this.updatePrompt();
        this.updateContentState({ currentPath: this.vfsCwd });
    }

    catFile(filename?: string): void {
        if (!filename) {
            this.addOutput('Dateiname fehlt', 'error');
            return;
        }
        const target = this.vfsResolve(filename);
        const file = VirtualFS.getFile(target);
        if (!file) this.addOutput(`Datei nicht gefunden: ${filename}`, 'error');
        else this.addOutput(file.content, 'output');
    }

    echo(text: string): void {
        this.addOutput(text, 'output');
    }

    showDate(): void {
        this.addOutput(new Date().toString(), 'output');
    }

    updatePrompt(): void {
        const prompt = this.element?.querySelector('.terminal-prompt') as HTMLElement | null;
        if (prompt) {
            prompt.textContent = `guest@marvin:${this.vfsCwd}$`;
        }
    }

    // ---------------------------
    // VirtualFS helpers & cmds
    // ---------------------------
    private vfsResolve(path?: string): string {
        // Default to current folder
        if (!path || path.trim() === '' || path === '.') return this.vfsCwd;

        // Handle tilde expansion for home directory
        let raw = path.trim();
        if (raw === '~') return '/home/marvin';
        if (raw.startsWith('~/')) raw = '/home/marvin/' + raw.slice(2);

        // Absolute path starts with /
        if (raw.startsWith('/')) {
            // Resolve '.' and '..'
            const parts = raw.split('/').filter(Boolean);
            const resolved: string[] = [];
            for (const p of parts) {
                if (p === '.') continue;
                if (p === '..') {
                    if (resolved.length > 0) resolved.pop();
                } else {
                    resolved.push(p);
                }
            }
            return '/' + resolved.join('/');
        }

        // Relative path: append to current directory
        const base = this.vfsCwd.split('/').filter(Boolean);
        const parts = raw.split('/').filter(Boolean);
        const combined = [...base, ...parts];

        // Resolve '.' and '..'
        const resolved: string[] = [];
        for (const p of combined) {
            if (p === '.') continue;
            if (p === '..') {
                if (resolved.length > 0) resolved.pop();
            } else {
                resolved.push(p);
            }
        }
        return '/' + resolved.join('/');
    }

    touch(path?: string): void {
        if (!path) {
            this.addOutput('Pfad/Dateiname fehlt', 'error');
            return;
        }
        const target = this.vfsResolve(path);
        const existing = VirtualFS.get(target);
        if (existing) {
            if (existing.type === 'file') {
                this.addOutput(`Datei existiert bereits: ${target}`, 'error');
            } else {
                this.addOutput(`Pfad ist ein Verzeichnis: ${target}`, 'error');
            }
            return;
        }
        // Ensure parent exists
        const parts = target.split('/');
        const name = parts.pop() as string;
        const parentPath = parts.join('/');
        const parent = VirtualFS.getFolder(parentPath);
        if (!parent) {
            this.addOutput(`Übergeordnetes Verzeichnis nicht gefunden: ${parentPath}`, 'error');
            return;
        }
        const ok = VirtualFS.createFile([...parts, name].join('/'), '');
        if (!ok) this.addOutput(`Konnte Datei nicht erstellen: ${target}`, 'error');
    }

    mkdir(path?: string): void {
        if (!path) {
            this.addOutput('Verzeichnisname fehlt', 'error');
            return;
        }
        const target = this.vfsResolve(path);
        const parts = target.split('/');
        const name = parts.pop() as string;
        const parentPath = parts.join('/');
        const parent = VirtualFS.getFolder(parentPath);
        if (!parent) {
            this.addOutput(`Übergeordnetes Verzeichnis nicht gefunden: ${parentPath}`, 'error');
            return;
        }
        const ok = VirtualFS.createFolder([...parts, name].join('/'));
        if (!ok) this.addOutput(`Konnte Verzeichnis nicht erstellen: ${target}`, 'error');
    }

    rm(path?: string): void {
        if (!path) {
            this.addOutput('Pfad fehlt', 'error');
            return;
        }
        const target = this.vfsResolve(path);
        if (!VirtualFS.get(target)) {
            this.addOutput(`Nicht gefunden: ${target}`, 'error');
            return;
        }
        const ok = VirtualFS.delete(target);
        if (!ok) this.addOutput(`Konnte nicht löschen: ${target}`, 'error');
    }

    // ---------------------------
    // Tab Completion
    // ---------------------------

    /**
     * Handle Tab key completion for commands and paths
     */
    private handleTabCompletion(): void {
        if (!this.inputElement) return;

        const input = this.inputElement.value;
        const [partialCmd, ...args] = input.split(' ');

        if (partialCmd === undefined) return;

        const availableCommands = [
            'help',
            'clear',
            'ls',
            'pwd',
            'cd',
            'cat',
            'touch',
            'mkdir',
            'rm',
            'echo',
            'date',
            'whoami',
        ];

        // Command completion (no arguments yet)
        if (args.length === 0) {
            const matches = availableCommands.filter(cmd => cmd.startsWith(partialCmd));

            if (matches.length === 1) {
                const match = matches[0];
                if (match !== undefined) {
                    this.inputElement.value = match + ' ';
                }
            } else if (matches.length > 1) {
                // Check if partialCmd is an exact match (complete command)
                if (availableCommands.includes(partialCmd)) {
                    // Already a complete command, just add space
                    this.inputElement.value = partialCmd + ' ';
                } else {
                    // Show all matches
                    this.addOutput(`guest@marvin:${this.vfsCwd}$ ${input}`, 'command');
                    this.addOutput(matches.join('  '), 'info');
                    // Complete to common prefix if longer than current input
                    const commonPrefix = this.findCommonPrefix(matches);
                    if (commonPrefix.length > partialCmd.length) {
                        this.inputElement.value = commonPrefix;
                    }
                }
            }
        } else {
            // Path/file completion for commands that take paths
            const pathCommands = ['cd', 'cat', 'ls', 'rm', 'touch', 'mkdir'];
            if (pathCommands.includes(partialCmd)) {
                this.completePathArgument(partialCmd, args[0] || '');
            }
        }
    }

    /**
     * Complete path argument for commands like cd, cat, ls, rm
     */
    private completePathArgument(cmd: string, partial: string): void {
        if (!this.inputElement) return;

        // Parse the partial path to determine directory and prefix
        let searchDir = this.vfsCwd;
        let searchPrefix = partial;

        // Handle relative paths (./, ../)
        if (partial.includes('/')) {
            const lastSlash = partial.lastIndexOf('/');
            const dirPart = partial.substring(0, lastSlash + 1);
            searchPrefix = partial.substring(lastSlash + 1);

            // Resolve the directory part
            if (dirPart === './') {
                searchDir = this.vfsCwd;
            } else if (dirPart === '../') {
                searchDir = this.parentPath(this.vfsCwd);
            } else {
                // Complex relative or absolute path
                const resolvedDir = this.vfsResolve(dirPart);
                const dirItem = VirtualFS.get(resolvedDir);
                if (dirItem?.type === 'folder') {
                    searchDir = resolvedDir;
                } else {
                    // Invalid directory, no completion
                    return;
                }
            }
        }

        // Get items in the search directory
        const items = VirtualFS.list(searchDir);
        const itemNames = Object.keys(items);

        // Filter based on command type
        let matches: string[] = [];
        if (cmd === 'cd') {
            // Only directories
            matches = itemNames.filter(name => {
                const item = items[name];
                return item?.type === 'folder' && name.startsWith(searchPrefix);
            });
        } else if (cmd === 'cat') {
            // Only files
            matches = itemNames.filter(name => {
                const item = items[name];
                return item?.type === 'file' && name.startsWith(searchPrefix);
            });
        } else {
            // Both files and directories (ls, rm, touch, mkdir)
            matches = itemNames.filter(name => name.startsWith(searchPrefix));
        }

        // Handle completion
        if (matches.length === 1) {
            const match = matches[0];
            if (match !== undefined) {
                const item = items[match];
                const suffix = item?.type === 'folder' ? '/' : '';
                // Reconstruct full path with prefix
                const dirPrefix = partial.includes('/')
                    ? partial.substring(0, partial.lastIndexOf('/') + 1)
                    : '';
                this.inputElement.value = `${cmd} ${dirPrefix}${match}${suffix}`;
            }
        } else if (matches.length > 1) {
            // Show all matches with icons
            this.addOutput(`guest@marvin:${this.vfsCwd}$ ${this.inputElement.value}`, 'command');
            const formatted = matches.map(name => {
                const item = items[name];
                const prefix = item?.type === 'folder' ? '📁 ' : '📄 ';
                return prefix + name;
            });
            this.addOutput(formatted.join('  '), 'info');

            // Complete to common prefix if available
            const commonPrefix = this.findCommonPrefix(matches);
            if (commonPrefix.length > searchPrefix.length) {
                const dirPrefix = partial.includes('/')
                    ? partial.substring(0, partial.lastIndexOf('/') + 1)
                    : '';
                this.inputElement.value = `${cmd} ${dirPrefix}${commonPrefix}`;
            }
        }
    }

    /**
     * Find common prefix among strings
     */
    private findCommonPrefix(strings: string[]): string {
        if (!strings.length) return '';
        const firstString = strings[0];
        if (strings.length === 1) return firstString ?? '';
        if (firstString === undefined) return '';

        let prefix: string = firstString;
        for (let i = 1; i < strings.length; i++) {
            const currentString = strings[i];
            if (currentString === undefined) continue;

            while (currentString.indexOf(prefix) !== 0) {
                prefix = prefix.substring(0, prefix.length - 1);
                if (!prefix) return '';
            }
        }
        return prefix;
    }

    /**
     * Get parent path of a given path
     */
    private parentPath(path: string): string {
        const parts = path.split('/').filter(Boolean);
        parts.pop();
        return parts.length > 0 ? '/' + parts.join('/') : '/';
    }
    /**
     * Serialize session state
     */
    serialize(): any {
        return {
            ...super.serialize(),
            currentPath: this.vfsCwd,
            commandHistory: this.commandHistory,
            vfsCwd: this.vfsCwd,
        };
    }

    /**
     * Restore session from state
     */
    static deserialize(state: any): TerminalSession {
        const session = new TerminalSession({
            id: state.id,
            title: state.title,
        });

        // Use vfsCwd if available, otherwise fall back to currentPath
        // Note: Path migration is handled centrally in MultiWindowSessionManager
        // before this method is called, so paths are already in the correct format
        if (state.vfsCwd) {
            session.vfsCwd = state.vfsCwd;
        } else if (state.currentPath) {
            session.vfsCwd = state.currentPath;
        }

        if (state.commandHistory) {
            session.commandHistory = state.commandHistory;
            session.historyIndex = session.commandHistory.length;
        }

        return session;
    }

    /**
     * Focus terminal input when tab is shown
     */
    protected onShow(): void {
        if (this.inputElement && typeof this.inputElement.focus === 'function') {
            this.inputElement.focus();
        }
    }
}

// Export to window
(window as any).TerminalSession = TerminalSession;
