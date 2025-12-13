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
                    this.commandHistory.push(command);
                    this.historyIndex = this.commandHistory.length;
                    this.updateContentState({ commandHistory: this.commandHistory });
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
            }
        });
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
