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
                type: 'terminal'
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
                        'Desktop': { type: 'directory', contents: {} },
                        'Documents': {
                            type: 'directory',
                            contents: {
                                'readme.txt': { type: 'file', content: 'Willkommen im Terminal!' }
                            }
                        },
                        'Downloads': { type: 'directory', contents: {} },
                        'welcome.txt': {
                            type: 'file',
                            content: 'Willkommen auf Marvins Portfolio-Website!\n\nGib "help" ein, um eine Liste verfügbarer Befehle zu sehen.'
                        }
                    }
                }
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
                output: initialState.output || []
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
            this.outputElement = this.container.querySelector('[data-terminal-output]');
            this.inputElement = this.container.querySelector('[data-terminal-input]');
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
                        this.updateState({ commandHistory: this.commandHistory });
                    }
                    this.inputElement.value = '';
                    this.inputElement.focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (this.historyIndex > 0) {
                        this.historyIndex--;
                        this.inputElement.value = this.commandHistory[this.historyIndex];
                    }
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (this.historyIndex < this.commandHistory.length - 1) {
                        this.historyIndex++;
                        this.inputElement.value = this.commandHistory[this.historyIndex];
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
            this.addOutput('Willkommen im Terminal! Gib "help" ein für verfügbare Befehle.', 'info');
        }

        /**
         * Execute a command
         * @param {string} command
         */
        executeCommand(command) {
            this.addOutput(`guest@marvin:${this.currentPath}$ ${command}`, 'command');

            const [cmd, ...args] = command.split(' ');

            const commands = {
                help: () => this.showHelp(),
                clear: () => this.clearOutput(),
                ls: () => this.listDirectory(),
                pwd: () => this.printWorkingDirectory(),
                cd: () => this.changeDirectory(args[0]),
                cat: () => this.catFile(args[0]),
                echo: () => this.echo(args.join(' ')),
                date: () => this.showDate(),
                whoami: () => this.addOutput('guest', 'output')
            };

            if (commands[cmd]) {
                commands[cmd]();
            } else {
                this.addOutput(`Befehl nicht gefunden: ${cmd}. Gib "help" ein für verfügbare Befehle.`, 'error');
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
                info: 'text-yellow-400'
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
                '  help      - Zeige diese Hilfe',
                '  clear     - Lösche Ausgabe',
                '  ls        - Liste Dateien',
                '  pwd       - Zeige aktuelles Verzeichnis',
                '  cd <dir>  - Wechsle Verzeichnis',
                '  cat <file>- Zeige Dateiinhalt',
                '  echo <text> - Gebe Text aus',
                '  date      - Zeige Datum/Zeit',
                '  whoami    - Zeige Benutzername'
            ];

            helpText.forEach(line => this.addOutput(line, 'info'));
        }

        /**
         * List directory
         */
        listDirectory() {
            const currentDir = this.resolvePath(this.currentPath);
            if (!currentDir || currentDir.type !== 'directory') {
                this.addOutput('Verzeichnis nicht gefunden', 'error');
                return;
            }

            const items = Object.keys(currentDir.contents);
            if (items.length === 0) {
                this.addOutput('(leer)', 'output');
            } else {
                items.forEach(item => {
                    const itemObj = currentDir.contents[item];
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

            // Simple path resolution (could be improved)
            let newPath = path === '..' ? this.parentPath(this.currentPath) : path;

            if (!this.resolvePath(newPath)) {
                this.addOutput(`Verzeichnis nicht gefunden: ${path}`, 'error');
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

            const currentDir = this.resolvePath(this.currentPath);
            const file = currentDir?.contents[filename];

            if (!file) {
                this.addOutput(`Datei nicht gefunden: ${filename}`, 'error');
            } else if (file.type !== 'file') {
                this.addOutput(`${filename} ist keine Datei`, 'error');
            } else {
                this.addOutput(file.content, 'output');
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
                fileSystem: this.fileSystem
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
                // This would create the modal/dialog container
                // For now, return a simple div
                const container = document.createElement('div');
                container.id = `${instanceId}-container`;
                container.className = 'terminal-instance-container';
                return container;
            }
        });
    }

})();
