console.log('Terminal System loaded');

/**
 * Terminal System
 *
 * Ein funktionaler Terminal-Emulator mit Unterstützung für grundlegende Befehle
 */
(function () {
    'use strict';

    const TerminalSystem = {
        container: null,
        outputElement: null,
        inputElement: null,
        commandHistory: [],
        historyIndex: -1,
        currentPath: '~',
        fileSystem: {
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
        },

        init: function (container) {
            if (this.container) {
                console.log('Terminal already initialized');
                return;
            }

            this.container = container;
            this.render();
            this.attachEventListeners();
            this.showWelcomeMessage();
            // Focus input immediately so users can start typing right away
            if (this.inputElement && typeof this.inputElement.focus === 'function') {
                this.inputElement.focus();
            }
        },

        render: function () {
            const html = `
                <div class="terminal-wrapper h-full flex flex-col bg-gray-900 text-green-400 font-mono text-sm">
                    <div id="terminal-output" class="terminal-output flex-1 overflow-y-auto p-4 space-y-1">
                    </div>
                    <div class="terminal-input-line flex items-center px-4 py-2 border-t border-gray-700">
                        <span class="terminal-prompt text-blue-400">guest@marvin:${this.currentPath}$</span>
                        <input
                            type="text"
                            id="terminal-input"
                            class="terminal-input flex-1 ml-2 bg-transparent outline-none text-green-400"
                            autocomplete="off"
                            spellcheck="false"
                            aria-label="Terminal input"
                        />
                    </div>
                </div>
            `;
            this.container.innerHTML = html;
            this.outputElement = document.getElementById('terminal-output');
            this.inputElement = document.getElementById('terminal-input');
            // Provide localized aria-label when possible
            try {
                const lang =
                    window.appI18n && typeof window.appI18n.getActiveLanguage === 'function'
                        ? window.appI18n.getActiveLanguage()
                        : (document.documentElement && document.documentElement.lang) || 'en';
                const label = String(lang).toLowerCase().startsWith('de')
                    ? 'Terminal-Eingabe'
                    : 'Terminal input';
                if (this.inputElement) this.inputElement.setAttribute('aria-label', label);
            } catch {
                /* noop */
            }
        },

        attachEventListeners: function () {
            if (!this.inputElement) return;

            this.inputElement.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const command = this.inputElement.value.trim();
                    if (command) {
                        this.executeCommand(command);
                        this.commandHistory.push(command);
                        this.historyIndex = this.commandHistory.length;
                    }
                    this.inputElement.value = '';
                    // Keep focus after executing a command
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
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    // Tab completion could be implemented here
                }
            });

            // Focus input when clicking anywhere in the terminal
            this.container.addEventListener('click', () => {
                this.inputElement.focus();
            });
        },

        showWelcomeMessage: function () {
            this.addOutput('Terminal v1.0.0 - Marvin Temmen Portfolio', 'text-cyan-400');
            this.addOutput(
                'Gib "help" ein, um eine Liste der verfügbaren Befehle zu sehen.',
                'text-gray-400'
            );
            this.addOutput('');
        },

        addOutput: function (text, className = '') {
            if (!this.outputElement) return;

            const line = document.createElement('div');
            line.className = `terminal-line ${className}`;
            line.textContent = text;
            this.outputElement.appendChild(line);

            // Auto-scroll to bottom
            this.outputElement.scrollTop = this.outputElement.scrollHeight;
        },

        addPromptLine: function (command) {
            this.addOutput(`guest@marvin:${this.currentPath}$ ${command}`, 'text-blue-400');
        },

        executeCommand: function (commandLine) {
            this.addPromptLine(commandLine);

            const parts = commandLine.trim().split(/\s+/);
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);

            const commands = {
                help: () => this.cmdHelp(),
                clear: () => this.cmdClear(),
                echo: () => this.cmdEcho(args),
                pwd: () => this.cmdPwd(),
                ls: () => this.cmdLs(args),
                cd: () => this.cmdCd(args),
                cat: () => this.cmdCat(args),
                date: () => this.cmdDate(),
                whoami: () => this.cmdWhoami(),
                uname: () => this.cmdUname(),
                about: () => this.cmdAbout(),
                github: () => this.cmdGithub(),
                contact: () => this.cmdContact(),
                skills: () => this.cmdSkills(),
                projects: () => this.cmdProjects(),
            };

            if (commands[command]) {
                commands[command]();
            } else if (command) {
                this.addOutput(`bash: ${command}: Befehl nicht gefunden`, 'text-red-400');
                this.addOutput(
                    'Gib "help" ein, um eine Liste der verfügbaren Befehle zu sehen.',
                    'text-gray-400'
                );
            }

            this.updatePrompt();
        },

        updatePrompt: function () {
            const promptElement = this.container.querySelector('.terminal-prompt');
            if (promptElement) {
                promptElement.textContent = `guest@marvin:${this.currentPath}$`;
            }
        },

        // Command implementations
        cmdHelp: function () {
            this.addOutput('');
            this.addOutput('Verfügbare Befehle:', 'text-yellow-400 font-bold');
            this.addOutput('');
            this.addOutput('  help          - Zeigt diese Hilfe an', 'text-gray-300');
            this.addOutput('  clear         - Löscht den Bildschirm', 'text-gray-300');
            this.addOutput('  echo [text]   - Gibt Text aus', 'text-gray-300');
            this.addOutput('  pwd           - Zeigt aktuelles Verzeichnis', 'text-gray-300');
            this.addOutput('  ls [dir]      - Listet Dateien und Ordner', 'text-gray-300');
            this.addOutput('  cd [dir]      - Wechselt das Verzeichnis', 'text-gray-300');
            this.addOutput('  cat [file]    - Zeigt Dateiinhalt an', 'text-gray-300');
            this.addOutput('  date          - Zeigt Datum und Uhrzeit', 'text-gray-300');
            this.addOutput('  whoami        - Zeigt Benutzername', 'text-gray-300');
            this.addOutput('  uname         - Zeigt Systeminfo', 'text-gray-300');
            this.addOutput('');
            this.addOutput('Portfolio-Befehle:', 'text-yellow-400 font-bold');
            this.addOutput('');
            this.addOutput('  about         - Informationen über Marvin', 'text-gray-300');
            this.addOutput('  github        - GitHub Profil öffnen', 'text-gray-300');
            this.addOutput('  contact       - Kontaktinformationen', 'text-gray-300');
            this.addOutput('  skills        - Zeigt Fähigkeiten', 'text-gray-300');
            this.addOutput('  projects      - Zeigt Projekte', 'text-gray-300');
            this.addOutput('');
        },

        cmdClear: function () {
            if (this.outputElement) {
                this.outputElement.innerHTML = '';
            }
        },

        cmdEcho: function (args) {
            this.addOutput(args.join(' '));
        },

        cmdPwd: function () {
            this.addOutput(this.currentPath);
        },

        cmdLs: function (args) {
            // Normalize path if provided
            let targetPath = args[0] || this.currentPath;
            if (args[0]) {
                targetPath = this.normalizePath(args[0]);
            }

            const dir = this.resolvePath(targetPath);

            if (!dir) {
                this.addOutput(
                    `ls: ${targetPath}: Datei oder Verzeichnis nicht gefunden`,
                    'text-red-400'
                );
                return;
            }

            if (dir.type !== 'directory') {
                this.addOutput(targetPath);
                return;
            }

            const entries = Object.keys(dir.contents);
            if (entries.length === 0) {
                return;
            }

            entries.forEach(entry => {
                const item = dir.contents[entry];
                const color = item.type === 'directory' ? 'text-blue-300' : 'text-green-400';
                const suffix = item.type === 'directory' ? '/' : '';
                this.addOutput(`  ${entry}${suffix}`, color);
            });
        },

        cmdCd: function (args) {
            if (args.length === 0 || args[0] === '~') {
                this.currentPath = '~';
                return;
            }

            // Normalize the path first
            const normalizedPath = this.normalizePath(args[0]);
            const dir = this.resolvePath(normalizedPath);

            if (!dir) {
                this.addOutput(
                    `cd: ${args[0]}: Datei oder Verzeichnis nicht gefunden`,
                    'text-red-400'
                );
                return;
            }

            if (dir.type !== 'directory') {
                this.addOutput(`cd: ${args[0]}: Ist kein Verzeichnis`, 'text-red-400');
                return;
            }

            // Update current path to the normalized path
            this.currentPath = normalizedPath;
        },

        cmdCat: function (args) {
            if (args.length === 0) {
                this.addOutput('cat: fehlender Operand', 'text-red-400');
                return;
            }

            // Normalize path before resolving
            const normalizedPath = this.normalizePath(args[0]);
            const file = this.resolvePath(normalizedPath);

            if (!file) {
                this.addOutput(
                    `cat: ${args[0]}: Datei oder Verzeichnis nicht gefunden`,
                    'text-red-400'
                );
                return;
            }

            if (file.type !== 'file') {
                this.addOutput(`cat: ${args[0]}: Ist ein Verzeichnis`, 'text-red-400');
                return;
            }

            const lines = file.content.split('\n');
            lines.forEach(line => this.addOutput(line));
        },

        cmdDate: function () {
            const now = new Date();
            this.addOutput(now.toString());
        },

        cmdWhoami: function () {
            this.addOutput('guest');
        },

        cmdUname: function () {
            this.addOutput('MarvinOS 1.0.0 (Portfolio Edition)');
        },

        cmdAbout: function () {
            this.addOutput('');
            this.addOutput('═══════════════════════════════════════', 'text-cyan-400');
            this.addOutput('  Marvin Temmen', 'text-yellow-400 font-bold text-lg');
            this.addOutput('  Softwareentwickler', 'text-gray-300');
            this.addOutput('═══════════════════════════════════════', 'text-cyan-400');
            this.addOutput('');
            this.addOutput('  📍 Deutschland', 'text-gray-300');
            this.addOutput('  💼 WinWorker', 'text-gray-300');
            this.addOutput('  🎂 März 1999', 'text-gray-300');
            this.addOutput('');
            this.addOutput(
                'Gib "skills", "projects" oder "contact" ein für mehr Infos.',
                'text-gray-400'
            );
            this.addOutput('');
        },

        cmdGithub: function () {
            this.addOutput('Öffne GitHub Profil...', 'text-blue-300');
            window.open('https://github.com/Marormur', '_blank');
        },

        cmdContact: function () {
            this.addOutput('');
            this.addOutput('Kontaktinformationen:', 'text-yellow-400 font-bold');
            this.addOutput('');
            this.addOutput(
                '  🔗 LinkedIn: https://linkedin.com/in/marvin-temmen-788537216',
                'text-gray-300'
            );
            this.addOutput('  🐙 GitHub:   https://github.com/Marormur', 'text-gray-300');
            this.addOutput('');
        },

        cmdSkills: function () {
            this.addOutput('');
            this.addOutput('Technische Fähigkeiten:', 'text-yellow-400 font-bold');
            this.addOutput('');
            this.addOutput('  💻 Programmierung:', 'text-cyan-400');
            this.addOutput('     • JavaScript, TypeScript, Python', 'text-gray-300');
            this.addOutput('     • HTML, CSS, Tailwind CSS', 'text-gray-300');
            this.addOutput('     • Node.js, React, Vue.js', 'text-gray-300');
            this.addOutput('');
            this.addOutput('  🛠  Tools & Technologien:', 'text-cyan-400');
            this.addOutput('     • Git, GitHub, VS Code', 'text-gray-300');
            this.addOutput('     • Docker, CI/CD', 'text-gray-300');
            this.addOutput('     • REST APIs, GraphQL', 'text-gray-300');
            this.addOutput('');
        },

        cmdProjects: function () {
            this.addOutput('');
            this.addOutput('Portfolio Projekte:', 'text-yellow-400 font-bold');
            this.addOutput('');
            this.addOutput('  📁 Diese Website', 'text-cyan-400');
            this.addOutput(
                '     Ein Desktop-Stil Portfolio mit macOS Look & Feel',
                'text-gray-300'
            );
            this.addOutput('     GitHub: https://github.com/Marormur/Website', 'text-gray-300');
            this.addOutput('');
            this.addOutput('Weitere Projekte auf GitHub verfügbar.', 'text-gray-400');
            this.addOutput('Gib "github" ein, um das Profil zu öffnen.', 'text-gray-400');
            this.addOutput('');
        },

        resolvePath: function (path) {
            if (!path) return null;

            // Normalize the path first
            const normalizedPath = this.normalizePath(path);

            // Handle home directory
            if (normalizedPath === '~') {
                return this.fileSystem['~'];
            }

            // Navigate through file system
            let current = this.fileSystem['~'];
            const parts = normalizedPath
                .replace(/^~\/?/, '')
                .split('/')
                .filter(p => p);

            for (const part of parts) {
                if (!current.contents || !current.contents[part]) {
                    return null;
                }
                current = current.contents[part];
            }

            return current;
        },

        /**
         * Normalize path (resolve ., .., ./, etc.)
         */
        normalizePath: function (path) {
            // Handle special cases
            if (!path || path === '~') return '~';
            if (path === '.') return this.currentPath;
            if (path === './') return this.currentPath;

            // Absolute path (starts with ~ or /)
            let workingPath;
            if (path.startsWith('~')) {
                workingPath = path;
            } else if (path.startsWith('/')) {
                workingPath = '~' + path;
            } else {
                // Relative path - combine with current path
                if (this.currentPath === '~') {
                    workingPath = `~/${path}`;
                } else {
                    workingPath = `${this.currentPath}/${path}`;
                }
            }

            // Split into parts and resolve . and ..
            const parts = workingPath.split('/').filter(p => p !== '' && p !== '.');
            const resolved = [];

            for (const part of parts) {
                if (part === '..') {
                    // Go up one directory (but not above ~)
                    if (resolved.length > 0 && resolved[resolved.length - 1] !== '~') {
                        resolved.pop();
                    }
                } else {
                    resolved.push(part);
                }
            }

            // Build final path
            if (resolved.length === 0 || (resolved.length === 1 && resolved[0] === '~')) {
                return '~';
            }

            // Ensure path starts with ~ if it's a home-relative path
            if (resolved[0] !== '~') {
                resolved.unshift('~');
            }

            return resolved.join('/');
        },
    };

    window.TerminalSystem = TerminalSystem;
})();
