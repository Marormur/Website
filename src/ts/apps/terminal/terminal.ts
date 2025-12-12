/**
 * terminal.ts
 * Terminal System - A functional terminal emulator with basic command support
 */

console.log('Terminal System loaded');

(() => {
    'use strict';

    // ===== Types =====

    interface FileSystemItem {
        type: 'file' | 'directory';
        content?: string;
        contents?: Record<string, FileSystemItem>;
    }

    type FileSystem = Record<string, FileSystemItem>;

    interface TerminalSystemType {
        container: HTMLElement | null;
        outputElement: HTMLElement | null;
        inputElement: HTMLInputElement | null;
        commandHistory: string[];
        historyIndex: number;
        currentPath: string;
        fileSystem: FileSystem;
        init(container: HTMLElement): void;
        render(): void;
        attachEventListeners(): void;
        showWelcomeMessage(): void;
        addOutput(text: string, className?: string): void;
        addPromptLine(command: string): void;
        executeCommand(commandLine: string): void;
        updatePrompt(): void;
        cmdHelp(): void;
        cmdClear(): void;
        cmdEcho(args: string[]): void;
        cmdPwd(): void;
        cmdLs(args: string[]): void;
        cmdCd(args: string[]): void;
        cmdCat(args: string[]): void;
        cmdDate(): void;
        cmdWhoami(): void;
        cmdUname(): void;
        cmdAbout(): void;
        cmdGithub(): void;
        cmdContact(): void;
        cmdSkills(): void;
        cmdProjects(): void;
        resolvePath(path: string): FileSystemItem | null;
        normalizePath(path: string): string;
    }

    // ===== Terminal System Implementation =====

    const TerminalSystem: TerminalSystemType = {
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

        init(container: HTMLElement): void {
            if (this.container) {
                console.log('Terminal already initialized');
                return;
            }

            this.container = container;
            this.render();
            this.attachEventListeners();
            this.showWelcomeMessage();
            // Focus input immediately so users can start typing right away
            if (this.inputElement?.focus) {
                this.inputElement.focus();
            }
        },

        render(): void {
            if (!this.container) return;

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
            this.inputElement = document.getElementById('terminal-input') as HTMLInputElement | null;

            // Provide localized aria-label when possible
            try {
                const appI18n = (window as Window & { appI18n?: { getActiveLanguage(): string } }).appI18n;
                const lang = appI18n?.getActiveLanguage?.() || document.documentElement?.lang || 'en';
                const label = String(lang).toLowerCase().startsWith('de')
                    ? 'Terminal-Eingabe'
                    : 'Terminal input';
                if (this.inputElement) this.inputElement.setAttribute('aria-label', label);
            } catch {
                /* noop */
            }
        },

        attachEventListeners(): void {
            if (!this.inputElement) return;

            this.inputElement.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const command = this.inputElement?.value.trim() || '';
                    if (command) {
                        this.executeCommand(command);
                        this.commandHistory.push(command);
                        this.historyIndex = this.commandHistory.length;
                    }
                    if (this.inputElement) this.inputElement.value = '';
                    // Keep focus after executing a command
                    this.inputElement?.focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (this.historyIndex > 0 && this.inputElement) {
                        this.historyIndex--;
                        this.inputElement.value = this.commandHistory[this.historyIndex] || '';
                    }
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (this.historyIndex < this.commandHistory.length - 1 && this.inputElement) {
                        this.historyIndex++;
                        this.inputElement.value = this.commandHistory[this.historyIndex] || '';
                    } else {
                        this.historyIndex = this.commandHistory.length;
                        if (this.inputElement) this.inputElement.value = '';
                    }
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    // Tab completion could be implemented here
                }
            });

            // Focus input when clicking anywhere in the terminal
            this.container?.addEventListener('click', () => {
                this.inputElement?.focus();
            });
        },

        showWelcomeMessage(): void {
            this.addOutput('Terminal v1.0.0 - Marvin Temmen Portfolio', 'text-cyan-400');
            this.addOutput(
                'Gib "help" ein, um eine Liste der verfügbaren Befehle zu sehen.',
                'text-gray-400'
            );
            this.addOutput('');
        },

        addOutput(text: string, className: string = ''): void {
            if (!this.outputElement) return;

            const line = document.createElement('div');
            line.className = `terminal-line ${className}`;
            line.textContent = text;
            this.outputElement.appendChild(line);

            // Auto-scroll to bottom
            this.outputElement.scrollTop = this.outputElement.scrollHeight;
        },

        addPromptLine(command: string): void {
            this.addOutput(`guest@marvin:${this.currentPath}$ ${command}`, 'text-blue-400');
        },

        executeCommand(commandLine: string): void {
            this.addPromptLine(commandLine);

            const parts = commandLine.trim().split(/\s+/);
            const command = parts[0]?.toLowerCase() || '';
            const args = parts.slice(1);

            const commands: Record<string, () => void> = {
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

        updatePrompt(): void {
            const promptElement = this.container?.querySelector('.terminal-prompt');
            if (promptElement) {
                promptElement.textContent = `guest@marvin:${this.currentPath}$`;
            }
        },

        // Command implementations
        cmdHelp(): void {
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

        cmdClear(): void {
            if (this.outputElement) {
                this.outputElement.innerHTML = '';
            }
        },

        cmdEcho(args: string[]): void {
            this.addOutput(args.join(' '));
        },

        cmdPwd(): void {
            this.addOutput(this.currentPath);
        },

        cmdLs(args: string[]): void {
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

            const entries = Object.keys(dir.contents || {});
            if (entries.length === 0) {
                return;
            }

            entries.forEach(entry => {
                const item = dir.contents?.[entry];
                if (item) {
                    const color = item.type === 'directory' ? 'text-blue-300' : 'text-green-400';
                    const suffix = item.type === 'directory' ? '/' : '';
                    this.addOutput(`  ${entry}${suffix}`, color);
                }
            });
        },

        cmdCd(args: string[]): void {
            if (args.length === 0 || args[0] === '~') {
                this.currentPath = '~';
                return;
            }

            // Normalize the path first
            const normalizedPath = this.normalizePath(args[0] || '');
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

        cmdCat(args: string[]): void {
            if (args.length === 0) {
                this.addOutput('cat: fehlender Operand', 'text-red-400');
                return;
            }

            // Normalize path before resolving
            const normalizedPath = this.normalizePath(args[0] || '');
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

            const lines = (file.content || '').split('\n');
            lines.forEach(line => this.addOutput(line));
        },

        cmdDate(): void {
            const now = new Date();
            this.addOutput(now.toString());
        },

        cmdWhoami(): void {
            this.addOutput('guest');
        },

        cmdUname(): void {
            this.addOutput('MarvinOS 1.0.0 (Portfolio Edition)');
        },

        cmdAbout(): void {
            this.addOutput('');
            this.addOutput('═══════════════════════════════════════', 'text-cyan-400');
            this.addOutput('  Marvin Temmen - Softwareentwickler', 'text-cyan-400 font-bold');
            this.addOutput('═══════════════════════════════════════', 'text-cyan-400');
            this.addOutput('');
            this.addOutput('📍 Standort: Deutschland', 'text-gray-300');
            this.addOutput('💼 Beruf: Softwareentwickler', 'text-gray-300');
            this.addOutput('🎂 Geboren: März 1999', 'text-gray-300');
            this.addOutput('');
            this.addOutput('Weitere Informationen:', 'text-yellow-400');
            this.addOutput('  github   - GitHub Profil', 'text-gray-400');
            this.addOutput('  contact  - Kontaktdaten', 'text-gray-400');
            this.addOutput('  skills   - Technische Fähigkeiten', 'text-gray-400');
            this.addOutput('  projects - Portfolio-Projekte', 'text-gray-400');
            this.addOutput('');
        },

        cmdGithub(): void {
            this.addOutput('');
            this.addOutput('GitHub Profil wird geöffnet...', 'text-green-400');
            this.addOutput('https://github.com/Marormur', 'text-blue-400');
            this.addOutput('');
            // Open in new window
            window.open('https://github.com/Marormur', '_blank');
        },

        cmdContact(): void {
            this.addOutput('');
            this.addOutput('Kontaktinformationen:', 'text-yellow-400 font-bold');
            this.addOutput('');
            this.addOutput('📧 E-Mail: Über GitHub verfügbar', 'text-gray-300');
            this.addOutput('🔗 GitHub: https://github.com/Marormur', 'text-gray-300');
            this.addOutput('');
        },

        cmdSkills(): void {
            this.addOutput('');
            this.addOutput('Technische Fähigkeiten:', 'text-yellow-400 font-bold');
            this.addOutput('');
            this.addOutput('💻 Programmiersprachen:', 'text-cyan-400');
            this.addOutput('  • JavaScript / TypeScript', 'text-gray-300');
            this.addOutput('  • Python', 'text-gray-300');
            this.addOutput('  • HTML / CSS', 'text-gray-300');
            this.addOutput('');
            this.addOutput('🛠️ Frameworks & Tools:', 'text-cyan-400');
            this.addOutput('  • React', 'text-gray-300');
            this.addOutput('  • Node.js', 'text-gray-300');
            this.addOutput('  • Tailwind CSS', 'text-gray-300');
            this.addOutput('  • Git / GitHub', 'text-gray-300');
            this.addOutput('');
        },

        cmdProjects(): void {
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

        resolvePath(path: string): FileSystemItem | null {
            if (!path) return null;

            // Normalize the path first
            const normalizedPath = this.normalizePath(path);

            // Handle home directory
            const homeDir = this.fileSystem['~'];
            if (normalizedPath === '~') {
                return homeDir || null;
            }

            // Navigate through file system
            let current: FileSystemItem | null = homeDir || null;
            if (!current) return null;

            const parts = normalizedPath
                .replace(/^~\/?/, '')
                .split('/')
                .filter(p => p);

            for (const part of parts) {
                if (!current || !current.contents?.[part]) {
                    return null;
                }
                current = current.contents[part] || null;
            }

            return current;
        },

        /**
         * Normalize path (resolve ., .., ./, etc.)
         */
        normalizePath(path: string): string {
            // Handle special cases
            if (!path || path === '~') return '~';
            if (path === '.') return this.currentPath;
            if (path === './') return this.currentPath;

            // Absolute path (starts with ~ or /)
            let workingPath: string;
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
            const resolved: string[] = [];

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

    (window as unknown as Window & { TerminalSystem: TerminalSystemType }).TerminalSystem = TerminalSystem;
})();

export {};
