console.log('TerminalInstance loaded');

/**
 * TerminalInstance - Multi-Instance fähige Terminal-Implementierung
 *
 * Beispiel-Implementierung basierend auf BaseWindowInstance
 * Zeigt, wie man ein bestehendes Modul für Multi-Instance umbauen kann
 */
(function () {
    'use strict';

    /**
     * Single Terminal Instance
     * Extends BaseWindowInstance to support multiple terminals
     */
    class TerminalInstance extends window.BaseWindowInstance {
        constructor(config) {
            super({
                ...config,
                type: 'terminal',
            });

            // Terminal-specific state
            this.outputElement = null;
            this.inputElement = null;
            this.commandHistory = [];
            this.historyIndex = -1;
            this.currentPath = '~';

            // Virtual file system (per instance!)
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
         * Initialize instance state
         * @protected
         */
        _initializeState(initialState) {
            return {
                ...super._initializeState(initialState),
                currentPath: initialState.currentPath || '~',
                commandHistory: initialState.commandHistory || [],
                output: initialState.output || [],
            };
        }

        /**
         * Render terminal UI
         * @protected
         */
        render() {
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
            this.outputElement = this.container.querySelector(
                '[data-terminal-output]',
            );
            this.inputElement = this.container.querySelector(
                '[data-terminal-input]',
            );
        }

        /**
         * Attach event listeners
         * @protected
         */
        attachEventListeners() {
            if (!this.inputElement) return;

            this.inputElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const command = this.inputElement.value.trim();
                    if (command) {
                        this.executeCommand(command);
                        this.commandHistory.push(command);
                        this.historyIndex = this.commandHistory.length;
                        this.updateState({
                            commandHistory: this.commandHistory,
                        });
                    }
                    this.inputElement.value = '';
                    this.inputElement.focus();
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    this.handleTabCompletion();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (this.historyIndex > 0) {
                        this.historyIndex--;
                        this.inputElement.value =
                            this.commandHistory[this.historyIndex];
                    }
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (this.historyIndex < this.commandHistory.length - 1) {
                        this.historyIndex++;
                        this.inputElement.value =
                            this.commandHistory[this.historyIndex];
                    } else {
                        this.historyIndex = this.commandHistory.length;
                        this.inputElement.value = '';
                    }
                }
            });
        }

        /**
         * Show welcome message
         */
        showWelcomeMessage() {
            this.addOutput(
                'Willkommen im Terminal! Gib "help" ein für verfügbare Befehle.',
                'info',
            );
        }

        /**
         * Handle tab completion
         */
        handleTabCompletion() {
            if (!this.inputElement) return;

            const input = this.inputElement.value;
            const [partialCmd, ...args] = input.split(' ');

            // Liste aller verfügbaren Befehle
            const availableCommands = [
                'help',
                'clear',
                'ls',
                'pwd',
                'cd',
                'cat',
                'echo',
                'date',
                'whoami',
            ];

            // Wenn noch kein Leerzeichen eingegeben wurde, vervollständige den Befehl
            if (args.length === 0) {
                const matches = availableCommands.filter((cmd) =>
                    cmd.startsWith(partialCmd),
                );

                if (matches.length === 1) {
                    // Exakte Übereinstimmung gefunden - vervollständige
                    this.inputElement.value = matches[0] + ' ';
                } else if (matches.length > 1) {
                    // Mehrere Übereinstimmungen - zeige Optionen
                    this.addOutput(
                        `guest@marvin:${this.currentPath}$ ${input}`,
                        'command',
                    );
                    this.addOutput(matches.join('  '), 'info');

                    // Finde gemeinsamen Präfix
                    const commonPrefix = this.findCommonPrefix(matches);
                    if (commonPrefix.length > partialCmd.length) {
                        this.inputElement.value = commonPrefix;
                    }
                }
            } else {
                // Vervollständige Datei-/Verzeichnisnamen für cd und cat
                if (partialCmd === 'cd' || partialCmd === 'cat') {
                    this.completePathArgument(partialCmd, args[0] || '');
                }
            }
        }

        /**
         * Find common prefix among strings
         * @param {Array<string>} strings
         * @returns {string}
         */
        findCommonPrefix(strings) {
            if (!strings.length) return '';
            if (strings.length === 1) return strings[0];

            let prefix = strings[0];
            for (let i = 1; i < strings.length; i++) {
                while (strings[i].indexOf(prefix) !== 0) {
                    prefix = prefix.substring(0, prefix.length - 1);
                    if (!prefix) return '';
                }
            }
            return prefix;
        }

        /**
         * Complete path argument (for cd, cat commands)
         * @param {string} cmd - The command (cd or cat)
         * @param {string} partial - Partial path/filename
         */
        completePathArgument(cmd, partial) {
            const currentDir = this.resolvePath(this.currentPath);
            if (!currentDir || currentDir.type !== 'directory') return;

            const items = Object.keys(currentDir.contents);

            // Filter basierend auf Befehlstyp
            let matches;
            if (cmd === 'cd') {
                // Nur Verzeichnisse für cd
                matches = items.filter(
                    (item) =>
                        currentDir.contents[item].type === 'directory' &&
                        item.startsWith(partial),
                );
            } else if (cmd === 'cat') {
                // Nur Dateien für cat
                matches = items.filter(
                    (item) =>
                        currentDir.contents[item].type === 'file' &&
                        item.startsWith(partial),
                );
            } else {
                // Alles
                matches = items.filter((item) => item.startsWith(partial));
            }

            if (matches.length === 1) {
                // Exakte Übereinstimmung - vervollständige
                this.inputElement.value = `${cmd} ${matches[0]}`;
            } else if (matches.length > 1) {
                // Mehrere Übereinstimmungen - zeige Optionen
                this.addOutput(
                    `guest@marvin:${this.currentPath}$ ${this.inputElement.value}`,
                    'command',
                );

                // Zeige mit Icon-Präfix (wie ls)
                const formatted = matches.map((item) => {
                    const itemObj = currentDir.contents[item];
                    const prefix = itemObj.type === 'directory' ? '📁 ' : '📄 ';
                    return prefix + item;
                });
                this.addOutput(formatted.join('  '), 'info');

                // Finde gemeinsamen Präfix
                const commonPrefix = this.findCommonPrefix(matches);
                if (commonPrefix.length > partial.length) {
                    this.inputElement.value = `${cmd} ${commonPrefix}`;
                }
            }
        }

        /**
         * Execute a command
         * @param {string} command
         */
        executeCommand(command) {
            this.addOutput(
                `guest@marvin:${this.currentPath}$ ${command}`,
                'command',
            );

            const [cmd, ...args] = command.split(' ');

            const commands = {
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

            if (commands[cmd]) {
                commands[cmd]();
            } else {
                this.addOutput(
                    `Befehl nicht gefunden: ${cmd}. Gib "help" ein für verfügbare Befehle.`,
                    'error',
                );
            }
        }

        /**
         * Add output line
         * @param {string} text
         * @param {string} type - 'command', 'output', 'error', 'info'
         */
        addOutput(text, type = 'output') {
            if (!this.outputElement) return;

            const line = document.createElement('div');
            line.className = `terminal-line terminal-${type}`;

            const colorMap = {
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

        /**
         * Clear output
         */
        clearOutput() {
            if (this.outputElement) {
                this.outputElement.innerHTML = '';
            }
        }

        /**
         * Show help
         */
        showHelp() {
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

            helpText.forEach((line) => this.addOutput(line, 'info'));
        }

        /**
         * List directory
         * @param {string} path - Optional path to list (defaults to current directory)
         */
        listDirectory(path) {
            // Resolve the path to list
            const targetPath = path
                ? this.normalizePath(path)
                : this.currentPath;
            const targetDir = this.resolvePath(targetPath);

            if (!targetDir) {
                this.addOutput(
                    `Verzeichnis nicht gefunden: ${path || targetPath}`,
                    'error',
                );
                return;
            }

            if (targetDir.type !== 'directory') {
                this.addOutput(
                    `${path || targetPath} ist kein Verzeichnis`,
                    'error',
                );
                return;
            }

            const items = Object.keys(targetDir.contents);
            if (items.length === 0) {
                this.addOutput('(leer)', 'output');
            } else {
                items.forEach((item) => {
                    const itemObj = targetDir.contents[item];
                    const prefix = itemObj.type === 'directory' ? '📁 ' : '📄 ';
                    this.addOutput(prefix + item, 'output');
                });
            }
        }

        /**
         * Print working directory
         */
        printWorkingDirectory() {
            this.addOutput(this.currentPath, 'output');
        }

        /**
         * Change directory
         * @param {string} path
         */
        changeDirectory(path) {
            if (!path) {
                this.currentPath = '~';
                this.updatePrompt();
                return;
            }

            // Normalize and resolve path
            const newPath = this.normalizePath(path);

            if (!this.resolvePath(newPath)) {
                this.addOutput(`Verzeichnis nicht gefunden: ${path}`, 'error');
                return;
            }

            const targetDir = this.resolvePath(newPath);
            if (targetDir.type !== 'directory') {
                this.addOutput(`${path} ist kein Verzeichnis`, 'error');
                return;
            }

            this.currentPath = newPath;
            this.updatePrompt();
            this.updateState({ currentPath: this.currentPath });
        }

        /**
         * Show file content
         * @param {string} filename
         */
        catFile(filename) {
            if (!filename) {
                this.addOutput('Dateiname fehlt', 'error');
                return;
            }

            // Check if it's a path (contains /) or just a filename
            let filePath, fileName;
            if (filename.includes('/')) {
                // It's a path - resolve it
                const normalizedPath = this.normalizePath(filename);
                const pathParts = normalizedPath
                    .split('/')
                    .filter((p) => p !== '');
                fileName = pathParts.pop();
                const dirPath =
                    pathParts.length > 0 ? pathParts.join('/') : '~';

                const dir = this.resolvePath(dirPath);
                if (!dir) {
                    this.addOutput(
                        `Verzeichnis nicht gefunden: ${dirPath}`,
                        'error',
                    );
                    return;
                }

                const file = dir.contents?.[fileName];
                if (!file) {
                    this.addOutput(
                        `Datei nicht gefunden: ${filename}`,
                        'error',
                    );
                } else if (file.type !== 'file') {
                    this.addOutput(`${filename} ist keine Datei`, 'error');
                } else {
                    this.addOutput(file.content, 'output');
                }
            } else {
                // Just a filename in current directory
                const currentDir = this.resolvePath(this.currentPath);
                const file = currentDir?.contents?.[filename];

                if (!file) {
                    this.addOutput(
                        `Datei nicht gefunden: ${filename}`,
                        'error',
                    );
                } else if (file.type !== 'file') {
                    this.addOutput(`${filename} ist keine Datei`, 'error');
                } else {
                    this.addOutput(file.content, 'output');
                }
            }
        }

        /**
         * Echo text
         * @param {string} text
         */
        echo(text) {
            this.addOutput(text, 'output');
        }

        /**
         * Show date
         */
        showDate() {
            this.addOutput(new Date().toString(), 'output');
        }

        /**
         * Update prompt
         */
        updatePrompt() {
            const prompt = this.container?.querySelector('.terminal-prompt');
            if (prompt) {
                prompt.textContent = `guest@marvin:${this.currentPath}$`;
            }
        }

        /**
         * Resolve path in file system
         * @param {string} path
         * @returns {Object|null}
         */
        resolvePath(path) {
            return this.fileSystem[path] || null;
        }

        /**
         * Normalize path (resolve ., .., ./, etc.)
         * @param {string} path
         * @returns {string}
         */
        normalizePath(path) {
            // Handle special cases
            if (!path || path === '~') return '~';
            if (path === '.') return this.currentPath;
            if (path === './') return this.currentPath;

            // Absolute path (starts with ~ or /)
            let workingPath;
            if (path.startsWith('~')) {
                workingPath = path;
            } else if (path.startsWith('/')) {
                workingPath = path;
            } else {
                // Relative path - combine with current path
                if (this.currentPath === '~') {
                    workingPath = `~/${path}`;
                } else {
                    workingPath = `${this.currentPath}/${path}`;
                }
            }

            // Split into parts and resolve . and ..
            const parts = workingPath
                .split('/')
                .filter((p) => p !== '' && p !== '.');
            const resolved = [];

            for (const part of parts) {
                if (part === '..') {
                    // Go up one directory (but not above ~)
                    if (
                        resolved.length > 0 &&
                        resolved[resolved.length - 1] !== '~'
                    ) {
                        resolved.pop();
                    }
                } else {
                    resolved.push(part);
                }
            }

            // Build final path
            if (
                resolved.length === 0 ||
                (resolved.length === 1 && resolved[0] === '~')
            ) {
                return '~';
            }

            // Ensure path starts with ~ if it's a home-relative path
            if (resolved[0] !== '~') {
                resolved.unshift('~');
            }

            return resolved.join('/');
        }

        /**
         * Get parent path
         * @param {string} path
         * @returns {string}
         */
        parentPath(path) {
            const parts = path.split('/').filter(Boolean);
            parts.pop();
            return parts.length > 0 ? '/' + parts.join('/') : '~';
        }

        /**
         * Serialize terminal state
         * @returns {Object}
         */
        serialize() {
            return {
                ...super.serialize(),
                currentPath: this.currentPath,
                commandHistory: this.commandHistory,
                fileSystem: this.fileSystem,
            };
        }

        /**
         * Restore terminal from saved state
         * @param {Object} data
         */
        deserialize(data) {
            super.deserialize(data);

            if (data.currentPath) {
                this.currentPath = data.currentPath;
                this.updatePrompt();
            }

            if (data.commandHistory) {
                this.commandHistory = data.commandHistory;
                this.historyIndex = this.commandHistory.length;
            }

            if (data.fileSystem) {
                this.fileSystem = data.fileSystem;
            }
        }

        /**
         * Focus terminal input
         */
        focus() {
            super.focus();
            if (this.inputElement) {
                this.inputElement.focus();
            }
        }
    }

    // Export
    window.TerminalInstance = TerminalInstance;

    // Create Terminal Instance Manager
    if (window.InstanceManager) {
        window.TerminalInstanceManager = new window.InstanceManager({
            type: 'terminal',
            instanceClass: TerminalInstance,
            maxInstances: 0, // Unlimited
            createContainer: function (instanceId) {
                // Create container and append to terminal modal container
                const terminalModalContainer =
                    document.getElementById('terminal-container');
                if (!terminalModalContainer) {
                    console.error('Terminal container not found');
                    return null;
                }

                const container = document.createElement('div');
                container.id = `${instanceId}-container`;
                container.className = 'terminal-instance-container h-full';

                // Initially hidden (will be shown by integration layer)
                container.classList.add('hidden');

                terminalModalContainer.appendChild(container);
                return container;
            },
        });
    }
})();
