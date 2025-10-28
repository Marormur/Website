console.log('TerminalInstance (TS) loaded');

/**
 * TerminalInstance - Multi-Instance capable terminal implementation
 * Ported to TypeScript with preserved global API and behavior.
 */
(() => {
  'use strict';

  type DirEntry = {
    type: 'directory';
    contents: Record<string, FSNode>;
  };
  type FileEntry = {
    type: 'file';
    content: string;
  };
  type FSNode = DirEntry | FileEntry;

  type BaseLike = {
    container: HTMLElement | null;
    updateState: (u: Record<string, unknown>) => void;
  } & Record<string, unknown>;
  type BaseCtor = new (cfg: Record<string, unknown>) => BaseLike & Record<string, unknown>;
  const Base = (window as unknown as { BaseWindowInstance: BaseCtor }).BaseWindowInstance;

  class TerminalInstance extends Base {
    outputElement: HTMLElement | null;
    inputElement: HTMLInputElement | null;
    commandHistory: string[];
    historyIndex: number;
    currentPath: string;
    fileSystem: Record<string, FSNode>;

    constructor(config: Record<string, unknown>) {
      super({
        ...config,
        type: 'terminal',
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

    // No override of _initializeState to avoid type modifier conflicts

    protected render(): void {
      if (!this.container) return;

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

      this.container.innerHTML = html;
      this.outputElement = this.container.querySelector('[data-terminal-output]');
      this.inputElement = this.container.querySelector('[data-terminal-input]');

      try {
        this.showWelcomeMessage();
      } catch {
        /* noop */
      }
      if (this.inputElement && typeof this.inputElement.focus === 'function') {
        this.inputElement.focus();
      }
    }

    protected attachEventListeners(): void {
      if (!this.inputElement) return;

      this.inputElement.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const command = this.inputElement!.value.trim();
          if (command) {
            this.executeCommand(command);
            this.commandHistory.push(command);
            this.historyIndex = this.commandHistory.length;
            this.updateState({ commandHistory: this.commandHistory });
          }
          this.inputElement!.value = '';
          this.inputElement!.focus();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          this.handleTabCompletion();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (this.historyIndex > 0) {
            this.historyIndex--;
            // noUncheckedIndexedAccess: array access may return undefined
            const historyEntry = this.commandHistory[this.historyIndex];
            if (historyEntry !== undefined) {
              this.inputElement!.value = historyEntry;
            }
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (this.historyIndex < this.commandHistory.length - 1) {
            this.historyIndex++;
            // noUncheckedIndexedAccess: array access may return undefined
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

    handleTabCompletion(): void {
      if (!this.inputElement) return;

      const input = this.inputElement.value;
      const [partialCmd, ...args] = input.split(' ');

      // noUncheckedIndexedAccess: array destructuring may return undefined
      if (partialCmd === undefined) return;

      const availableCommands = ['help', 'clear', 'ls', 'pwd', 'cd', 'cat', 'echo', 'date', 'whoami'];

      if (args.length === 0) {
        const matches = availableCommands.filter((cmd) => cmd.startsWith(partialCmd));

        if (matches.length === 1) {
          const match = matches[0];
          if (match !== undefined) {
            this.inputElement.value = match + ' ';
          }
        } else if (matches.length > 1) {
          this.addOutput(`guest@marvin:${this.currentPath}$ ${input}`, 'command');
          this.addOutput(matches.join('  '), 'info');
          const commonPrefix = this.findCommonPrefix(matches);
          if (commonPrefix.length > partialCmd.length) {
            this.inputElement.value = commonPrefix;
          }
        }
      } else {
        if (partialCmd === 'cd' || partialCmd === 'cat') {
          this.completePathArgument(partialCmd, args[0] || '');
        }
      }
    }

    findCommonPrefix(strings: string[]): string {
      if (!strings.length) return '';
      // noUncheckedIndexedAccess: array access may return undefined
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

    completePathArgument(cmd: 'cd' | 'cat', partial: string): void {
      const currentDir = this.resolvePath(this.currentPath);
      if (!currentDir || currentDir.type !== 'directory') return;

      const items = Object.keys(currentDir.contents);
      let matches: string[];
      if (cmd === 'cd') {
        matches = items.filter(
          (item) => (currentDir.contents[item] as FSNode).type === 'directory' && item.startsWith(partial)
        );
      } else {
        matches = items.filter(
          (item) => (currentDir.contents[item] as FSNode).type === 'file' && item.startsWith(partial)
        );
      }

      if (matches.length === 1) {
        this.inputElement!.value = `${cmd} ${matches[0]}`;
      } else if (matches.length > 1) {
        this.addOutput(`guest@marvin:${this.currentPath}$ ${this.inputElement!.value}`, 'command');
        const formatted = matches.map((item) => {
          // noUncheckedIndexedAccess: dictionary access may return undefined
          const itemObj = currentDir.contents[item] as FSNode | undefined;
          if (!itemObj) return item;
          const prefix = itemObj.type === 'directory' ? '📁 ' : '📄 ';
          return prefix + item;
        });
        this.addOutput(formatted.join('  '), 'info');
        const commonPrefix = this.findCommonPrefix(matches);
        if (commonPrefix.length > partial.length) {
          this.inputElement!.value = `${cmd} ${commonPrefix}`;
        }
      }
    }

    executeCommand(command: string): void {
      this.addOutput(`guest@marvin:${this.currentPath}$ ${command}`, 'command');
      const [cmd, ...args] = command.split(' ');

      // noUncheckedIndexedAccess: array destructuring may return undefined
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
        this.addOutput(`Befehl nicht gefunden: ${cmd}. Gib "help" ein für verfügbare Befehle.`, 'error');
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
        '  help         - Zeige diese Hilfe',
        '  clear        - Lösche Ausgabe',
        '  ls [path]    - Liste Dateien (optional mit Pfad)',
        '  pwd          - Zeige aktuelles Verzeichnis',
        '  cd <dir>     - Wechsle Verzeichnis (., .., ~, relative/absolute Pfade)',
        '  cat <file>   - Zeige Dateiinhalt (auch mit Pfad: cat ./file oder cat dir/file)',
        '  echo <text>  - Gebe Text aus',
        '  date         - Zeige Datum/Zeit',
        '  whoami       - Zeige Benutzername',
        '',
        'Pfad-Beispiele:',
        '  .            - Aktuelles Verzeichnis',
        '  ..           - Übergeordnetes Verzeichnis',
        '  ~            - Home-Verzeichnis',
        '  ./file       - Datei im aktuellen Verzeichnis',
        '  ../file      - Datei im übergeordneten Verzeichnis',
        '  dir/subdir   - Unterverzeichnis (relativ)',
        '',
        'Tipps:',
        '  ↑/↓          - Durchsuche Befehlshistorie',
        '  Tab          - Vervollständige Befehle und Pfade',
      ];
      helpText.forEach((l) => this.addOutput(l, 'info'));
    }

    listDirectory(path?: string): void {
      const targetPath = path ? this.normalizePath(path) : this.currentPath;
      const targetDir = this.resolvePath(targetPath);
      if (!targetDir) {
        this.addOutput(`Verzeichnis nicht gefunden: ${path || targetPath}`, 'error');
        return;
      }
      if (targetDir.type !== 'directory') {
        this.addOutput(`${path || targetPath} ist kein Verzeichnis`, 'error');
        return;
      }
      const items = Object.keys(targetDir.contents);
      if (items.length === 0) this.addOutput('(leer)', 'output');
      else {
        items.forEach((item) => {
          // noUncheckedIndexedAccess: dictionary access may return undefined
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
      if (!resolved) {
        this.addOutput(`Verzeichnis nicht gefunden: ${path}`, 'error');
        return;
      }
      if (resolved.type !== 'directory') {
        this.addOutput(`${path} ist kein Verzeichnis`, 'error');
        return;
      }
      this.currentPath = newPath;
      this.updatePrompt();
      this.updateState({ currentPath: this.currentPath });
    }

    catFile(filename?: string): void {
      if (!filename) {
        this.addOutput('Dateiname fehlt', 'error');
        return;
      }
      if (filename.includes('/')) {
        const normalizedPath = this.normalizePath(filename);
        const pathParts = normalizedPath.split('/').filter((p) => p !== '');
        const fileName = pathParts.pop()!;
        const dirPath = pathParts.length > 0 ? pathParts.join('/') : '~';
        const dir = this.resolvePath(dirPath);
        if (!dir) {
          this.addOutput(`Verzeichnis nicht gefunden: ${dirPath}`, 'error');
          return;
        }
        const file = (dir as DirEntry).contents?.[fileName] as FSNode | undefined;
        if (!file) this.addOutput(`Datei nicht gefunden: ${filename}`, 'error');
        else if (file.type !== 'file') this.addOutput(`${filename} ist keine Datei`, 'error');
        else this.addOutput(file.content, 'output');
      } else {
        const currentDir = this.resolvePath(this.currentPath) as DirEntry | null;
        const file = currentDir?.contents?.[filename] as FSNode | undefined;
        if (!file) this.addOutput(`Datei nicht gefunden: ${filename}`, 'error');
        else if (file.type !== 'file') this.addOutput(`${filename} ist keine Datei`, 'error');
        else this.addOutput(file.content, 'output');
      }
    }

    echo(text: string): void {
      this.addOutput(text, 'output');
    }

    showDate(): void {
      this.addOutput(new Date().toString(), 'output');
    }

    updatePrompt(): void {
      const prompt = this.container?.querySelector('.terminal-prompt') as HTMLElement | null;
      if (prompt) {
        prompt.textContent = `guest@marvin:${this.currentPath}$`;
      }
    }

    resolvePath(path: string | undefined | null): FSNode | null {
      if (!path) return null;
      const normalizedPath = this.normalizePath(path);

      // noUncheckedIndexedAccess: dictionary access may return undefined
      const homeNode = this.fileSystem['~'];
      if (normalizedPath === '~') return homeNode ?? null;
      if (homeNode === undefined) return null;

      let current: FSNode = homeNode;
      const parts = normalizedPath
        .replace(/^~\/?/, '')
        .split('/')
        .filter((p) => p);
      for (const part of parts) {
        if ((current as DirEntry).type !== 'directory') return null;
        if (!(current as DirEntry).contents || !(current as DirEntry).contents[part]) return null;
        // noUncheckedIndexedAccess: dictionary access may return undefined
        const nextNode = (current as DirEntry).contents[part];
        if (nextNode === undefined) return null;
        current = nextNode;
      }
      return current;
    }

    normalizePath(path: string): string {
      if (!path || path === '~') return '~';
      if (path === '.') return this.currentPath;
      if (path === './') return this.currentPath;
      let workingPath: string;
      if (path.startsWith('~')) workingPath = path;
      else if (path.startsWith('/')) workingPath = '~' + path;
      else workingPath = this.currentPath === '~' ? `~/${path}` : `${this.currentPath}/${path}`;
      const parts = workingPath.split('/').filter((p) => p !== '' && p !== '.');
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

    parentPath(path: string): string {
      const parts = path.split('/').filter(Boolean);
      parts.pop();
      return parts.length > 0 ? '/' + parts.join('/') : '~';
    }

    serialize(): Record<string, unknown> {
      const baseSerialize = (Base.prototype as unknown as {
        serialize: () => Record<string, unknown>;
      }).serialize;
      const baseObj = baseSerialize.call(this) as Record<string, unknown>;
      return {
        ...baseObj,
        currentPath: this.currentPath,
        commandHistory: this.commandHistory,
        fileSystem: this.fileSystem,
      } as Record<string, unknown>;
    }

    deserialize(data: Record<string, unknown>): void {
      const baseDeserialize = (Base.prototype as unknown as {
        deserialize: (d: Record<string, unknown>) => void;
      }).deserialize;
      baseDeserialize.call(this, data);
      const d = data as Record<string, unknown> & {
        currentPath?: string;
        commandHistory?: string[];
        fileSystem?: Record<string, FSNode>;
      };
      if (d.currentPath) {
        this.currentPath = d.currentPath;
        this.updatePrompt();
      }
      if (d.commandHistory) {
        this.commandHistory = d.commandHistory;
        this.historyIndex = this.commandHistory.length;
      }
      if (d.fileSystem) {
        this.fileSystem = d.fileSystem;
      }
    }

    focus(): void {
      const baseFocus = (Base.prototype as unknown as { focus: () => void }).focus;
      baseFocus.call(this);
      if (this.inputElement) this.inputElement.focus();
    }
  }

  (window as unknown as { TerminalInstance: typeof TerminalInstance }).TerminalInstance = TerminalInstance;

  // Create Terminal Instance Manager
  const G = window as unknown as Record<string, unknown>;
  type InstanceManagerCtor = new (cfg: Record<string, unknown>) => unknown;
  const InstanceManager = (G['InstanceManager'] as unknown) as InstanceManagerCtor | undefined;
  if (InstanceManager) {
  (G['TerminalInstanceManager'] as unknown) = new (InstanceManager as InstanceManagerCtor)({
      type: 'terminal',
      instanceClass: TerminalInstance,
      maxInstances: 0,
      createContainer: function (instanceId: string): HTMLElement | null {
        const terminalModalContainer = document.getElementById('terminal-container');
        if (!terminalModalContainer) {
          console.error('Terminal container not found');
          return null;
        }
        const container = document.createElement('div');
        container.id = `${instanceId}-container`;
        container.className = 'terminal-instance-container h-full';
        // Use DOMUtils if available to hide initially, else fallback
        const domUtils = (window as unknown as { DOMUtils?: { hide?: (el: Element) => void } })
          .DOMUtils;
        if (domUtils && typeof domUtils.hide === 'function') {
          domUtils.hide(container);
        } else {
          container.classList.add('hidden');
        }
        terminalModalContainer.appendChild(container);
        return container;
      },
    });
  }
})();
