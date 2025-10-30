/**
 * src/ts/terminal-session.ts
 * Terminal session as a tab within a terminal window
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseTab, type TabConfig } from './base-tab.js';

type DirEntry = {
    type: 'directory';
    contents: Record<string, FSNode>;
};
type FileEntry = {
    type: 'file';
    content: string;
};
type FSNode = DirEntry | FileEntry;

/**
 * TerminalSession - Individual terminal session tab
 *
 * Features:
 * - Command execution
 * - File system simulation
 * - Command history
 * - Tab completion
 */
export class TerminalSession extends BaseTab {
    outputElement: HTMLElement | null;
    inputElement: HTMLInputElement | null;
    commandHistory: string[];
    historyIndex: number;
    currentPath: string;
    fileSystem: Record<string, FSNode>;

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
        this.currentPath = '~';

        this.fileSystem = {
            '~': {
                type: 'directory',
                contents: {
                    Desktop: { type: 'directory', contents: {} },
                    Documents: {
                        type: 'directory',
                        contents: {
                            'readme.txt': {
                                type: 'file',
                                content: 'Willkommen im Terminal!',
                            },
                        },
                    },
                    Downloads: { type: 'directory', contents: {} },
                    'welcome.txt': {
                        type: 'file',
                        content:
                            'Willkommen auf Marvins Portfolio-Website!\n\nGib "help" ein, um eine Liste verfügbarer Befehle zu sehen.',
                    },
                },
            },
        };
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
                    <span class="terminal-prompt text-blue-400">guest@marvin:${this.currentPath}$</span>
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
        this.addOutput(`guest@marvin:${this.currentPath}$ ${command}`, 'command');
        const [cmd, ...args] = command.split(' ');

        if (cmd === undefined) return;

        const commands: Record<string, () => void> = {
            help: () => this.showHelp(),
            clear: () => this.clearOutput(),
            ls: () => this.listDirectory(args[0]),
            pwd: () => this.printWorkingDirectory(),
            cd: () => this.changeDirectory(args[0]),
            cat: () => this.catFile(args[0]),
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
            '  echo <t> - Gebe Text aus',
            '  date     - Zeige Datum/Zeit',
            '  whoami   - Zeige Benutzername',
        ];
        helpText.forEach(l => this.addOutput(l, 'info'));
    }

    listDirectory(path?: string): void {
        const targetPath = path ? this.normalizePath(path) : this.currentPath;
        const targetDir = this.resolvePath(targetPath);
        if (!targetDir || targetDir.type !== 'directory') {
            this.addOutput(`Verzeichnis nicht gefunden: ${path || targetPath}`, 'error');
            return;
        }
        const items = Object.keys(targetDir.contents);
        if (items.length === 0) this.addOutput('(leer)', 'output');
        else {
            items.forEach(item => {
                const itemObj = targetDir.contents[item];
                if (!itemObj) return;
                const prefix = itemObj.type === 'directory' ? '📁 ' : '📄 ';
                this.addOutput(prefix + item, 'output');
            });
        }
    }

    printWorkingDirectory(): void {
        this.addOutput(this.currentPath, 'output');
    }

    changeDirectory(path?: string): void {
        if (!path) {
            this.currentPath = '~';
            this.updatePrompt();
            return;
        }
        const newPath = this.normalizePath(path);
        const resolved = this.resolvePath(newPath);
        if (!resolved || resolved.type !== 'directory') {
            this.addOutput(`Verzeichnis nicht gefunden: ${path}`, 'error');
            return;
        }
        this.currentPath = newPath;
        this.updatePrompt();
        this.updateContentState({ currentPath: this.currentPath });
    }

    catFile(filename?: string): void {
        if (!filename) {
            this.addOutput('Dateiname fehlt', 'error');
            return;
        }
        const currentDir = this.resolvePath(this.currentPath) as DirEntry | null;
        const file = currentDir?.contents?.[filename] as FSNode | undefined;
        if (!file) this.addOutput(`Datei nicht gefunden: ${filename}`, 'error');
        else if (file.type !== 'file') this.addOutput(`${filename} ist keine Datei`, 'error');
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
            prompt.textContent = `guest@marvin:${this.currentPath}$`;
        }
    }

    resolvePath(path: string | undefined | null): FSNode | null {
        if (!path) return null;
        const normalizedPath = this.normalizePath(path);
        const homeNode = this.fileSystem['~'];
        if (normalizedPath === '~') return homeNode ?? null;
        if (homeNode === undefined) return null;

        let current: FSNode = homeNode;
        const parts = normalizedPath
            .replace(/^~\/?/, '')
            .split('/')
            .filter(p => p);
        for (const part of parts) {
            if ((current as DirEntry).type !== 'directory') return null;
            const nextNode = (current as DirEntry).contents[part];
            if (nextNode === undefined) return null;
            current = nextNode;
        }
        return current;
    }

    normalizePath(path: string): string {
        if (!path || path === '~') return '~';
        if (path === '.') return this.currentPath;
        let workingPath: string;
        if (path.startsWith('~')) workingPath = path;
        else if (path.startsWith('/')) workingPath = '~' + path;
        else workingPath = this.currentPath === '~' ? `~/${path}` : `${this.currentPath}/${path}`;
        const parts = workingPath.split('/').filter(p => p !== '' && p !== '.');
        const resolved: string[] = [];
        for (const part of parts) {
            if (part === '..') {
                if (resolved.length > 0 && resolved[resolved.length - 1] !== '~') {
                    resolved.pop();
                }
            } else {
                resolved.push(part);
            }
        }
        if (resolved.length === 0 || (resolved.length === 1 && resolved[0] === '~')) return '~';
        if (resolved[0] !== '~') resolved.unshift('~');
        return resolved.join('/');
    }

    /**
     * Serialize session state
     */
    serialize(): any {
        return {
            ...super.serialize(),
            currentPath: this.currentPath,
            commandHistory: this.commandHistory,
            fileSystem: this.fileSystem,
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

        if (state.currentPath) {
            session.currentPath = state.currentPath;
        }
        if (state.commandHistory) {
            session.commandHistory = state.commandHistory;
            session.historyIndex = session.commandHistory.length;
        }
        if (state.fileSystem) {
            session.fileSystem = state.fileSystem;
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
