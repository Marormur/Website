/**
 * src/ts/terminal-session.ts
 * Terminal session as a tab within a terminal window
 *
 * Uses the shared VirtualFS for file system operations.
 * Uses VDOM for efficient output rendering without losing input focus.
 */

import { BaseTab, type TabConfig, type TabState } from '../../windows/base-tab.js';
import { VirtualFS } from '../../services/virtual-fs.js';
import { h, diff, patch, createElement, type VNode } from '../../core/vdom.js';
import {
    focusTerminalInputAtEnd,
    getTerminalInputShell,
    setTerminalInputShellFocused,
    syncTerminalInputMetrics,
} from './terminal-input-shell.js';
import logger from '../../core/logger.js';

/**
 * TerminalSession - Individual terminal session tab
 *
 * Features:
 * - Command execution with VirtualFS integration
 * - Shared file system with Finder
 * - Command history
 * - Path resolution and navigation
 * - VDOM-based rendering for focus preservation and performance
 */
export class TerminalSession extends BaseTab {
    outputElement: HTMLElement | null;
    inputElement: HTMLInputElement | null;
    commandHistory: string[];
    historyIndex: number;
    vfsCwd: string;
    previousVfsCwd: string;
    lastExecutedCommand: string;

    // VDOM State - tracks virtual tree for efficient updates
    private _vTree: VNode | null = null;
    private _outputLines: VNode[] = [];

    private _getScrollElement(): HTMLElement | null {
        return this.element?.querySelector('[data-terminal-scroll]') ?? null;
    }

    private _getCurrentFolderLabel(): string {
        const parts = this.vfsCwd.split('/').filter(Boolean);
        return parts[parts.length - 1] || '/';
    }

    private _getCommandLabel(): string {
        const raw = (this.lastExecutedCommand || '').trim() || 'zsh';
        const normalized = raw.replace(/\s+/g, ' ');
        return normalized.length > 28 ? `${normalized.slice(0, 27)}…` : normalized;
    }

    private _updateTabTitle(lastCommand?: string): void {
        if (typeof lastCommand === 'string' && lastCommand.trim()) {
            this.lastExecutedCommand = lastCommand.trim();
        }

        const nextTitle = `${this._getCurrentFolderLabel()} - ${this._getCommandLabel()}`;
        if (this.title !== nextTitle) {
            this.setTitle(nextTitle);
        }
    }

    private _getInputShell(): HTMLElement | null {
        return getTerminalInputShell(this.element);
    }

    private _syncInputMetrics(): void {
        syncTerminalInputMetrics(this.inputElement, this.element);
    }

    private _focusInputAtEnd(): void {
        focusTerminalInputAtEnd(this.inputElement, this.element);
    }

    private _attachSurfaceFocusHandler(): void {
        this.element?.addEventListener('click', event => {
            const target = event.target as HTMLElement | null;
            if (target?.closest('[data-terminal-input]')) return;

            const selection = window.getSelection();
            if (selection && String(selection).length > 0) return;

            this._focusInputAtEnd();
        });
    }

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
        this.previousVfsCwd = '/home/marvin';
        this.lastExecutedCommand = 'zsh';

        // Ensure VirtualFS has default structure for tests/dev if storage is empty or corrupted
        try {
            const home = VirtualFS.getFolder('/home/marvin');
            if (!home || !home.children) {
                logger.warn('TERMINAL', '[TerminalSession] VirtualFS missing defaults, resetting');
                VirtualFS.reset();
            }
        } catch (error) {
            logger.warn('TERMINAL', '[TerminalSession] VirtualFS check failed, resetting', error);
            VirtualFS.reset();
        }
    }

    /**
     * Create terminal DOM using VDOM
     */
    createDOM(): HTMLElement {
        const container = document.createElement('div');
        container.id = `${this.id}-container`;
        container.className = 'tab-content hidden w-full h-full';

        this.element = container;

        // Initial render with VDOM (queries DOM elements internally)
        this._renderTerminal();

        // Attach event listeners once (they persist across VDOM updates)
        this._attachEventListeners();
        this._attachSurfaceFocusHandler();
        this._updateTabTitle();

        this.showWelcomeMessage();

        return container;
    }

    private _attachEventListeners(): void {
        if (!this.inputElement) return;

        // Attach event listener once - it will persist across VDOM updates
        // since the input element is keyed and won't be recreated
        this.inputElement.addEventListener('keydown', this._handleKeyDown.bind(this));
        this.inputElement.addEventListener('input', () => this._syncInputMetrics());
        this.inputElement.addEventListener('focus', () => {
            setTerminalInputShellFocused(this.element, true);
            this._syncInputMetrics();
        });
        this.inputElement.addEventListener('blur', () => {
            setTerminalInputShellFocused(this.element, false);
        });
    }

    /**
     * Handle keydown events on terminal input
     */
    private _handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Enter') {
            e.preventDefault();
            const command = this.inputElement!.value.trim();
            if (command) {
                this.executeCommand(command);
                // Note: commandHistory is now updated in executeCommand()
            }
            this.inputElement!.value = '';
            this._focusInputAtEnd();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                const historyEntry = this.commandHistory[this.historyIndex];
                if (historyEntry !== undefined) {
                    this.inputElement!.value = historyEntry;
                    this._syncInputMetrics();
                }
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                const historyEntry = this.commandHistory[this.historyIndex];
                if (historyEntry !== undefined) {
                    this.inputElement!.value = historyEntry;
                    this._syncInputMetrics();
                }
            } else {
                this.historyIndex = this.commandHistory.length;
                this.inputElement!.value = '';
                this._syncInputMetrics();
            }
        } else if (e.key === 'Tab') {
            // Keep focus and prevent browser focus traversal.
            e.preventDefault();
            this.handleTabCompletion();
        }
    }

    /**
     * Render terminal UI using VDOM
     * This method efficiently updates the terminal without losing input focus
     *
     * Key invariant: The input element is never recreated; it's keyed to persist across
     * VDOM updates. This preserves focus and value during incremental renders.
     */
    private _renderTerminal(): void {
        logger.debug('TERMINAL', '[DEBUG] TerminalSession._renderTerminal() CALLED', {
            hasElement: !!this.element,
            hasVTree: !!this._vTree,
            outputLines: this._outputLines.length,
        });
        if (!this.element) return;

        // Build virtual tree for terminal
        const vTree = h(
            'div',
            {
                class: 'terminal-wrapper h-full flex flex-col bg-gray-900 text-green-400 font-mono text-sm',
            },
            h(
                'div',
                {
                    class: 'terminal-scroll-area flex-1 overflow-y-auto',
                    'data-terminal-scroll': 'true',
                },
                h(
                    'div',
                    {
                        class: 'terminal-output space-y-1',
                        'data-terminal-output': 'true',
                    },
                    ...this._outputLines
                ),
                h(
                    'div',
                    {
                        class: 'terminal-prompt-row',
                    },
                    h(
                        'span',
                        { class: 'terminal-prompt text-blue-400' },
                        `guest@marvin:${this.vfsCwd}$`
                    ),
                    h(
                        'div',
                        {
                            class: 'terminal-input-shell',
                            'data-terminal-input-shell': 'true',
                        },
                        h('input', {
                            type: 'text',
                            class: 'terminal-input bg-transparent outline-none text-green-400',
                            'data-terminal-input': 'true',
                            autocomplete: 'off',
                            spellcheck: false,
                            'aria-label': 'Terminal input',
                            key: 'terminal-input',
                        }),
                        h('span', {
                            class: 'terminal-caret',
                            'aria-hidden': 'true',
                        })
                    )
                )
            )
        );

        // Apply VDOM updates
        if (!this._vTree) {
            // Initial render: create DOM from scratch
            const dom = createElement(vTree);
            // Clear container to ensure clean initial state
            this.element.innerHTML = '';
            this.element.appendChild(dom);
        } else {
            // Update: intelligent diff + patch
            // CRITICAL: patch only accepts the root container element, NOT its wrapper
            const patches = diff(this._vTree, vTree);
            if (patches.length > 0) {
                const root = this.element.firstChild as HTMLElement;
                if (root) {
                    patch(root, patches);
                }
            }
        }

        this._vTree = vTree;

        // Always re-query DOM elements to ensure we have correct references
        // This is safe because the input element has a key and won't be recreated
        if (!this.outputElement || !this.inputElement) {
            this.outputElement = this.element.querySelector('[data-terminal-output]');
            this.inputElement = this.element.querySelector('[data-terminal-input]');
        }

        this._syncInputMetrics();
        if (document.activeElement === this.inputElement) {
            setTerminalInputShellFocused(this.element, true);
        }
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
            'exit',
            'ls',
            'pwd',
            'cd',
            'cat',
            'touch',
            'mkdir',
            'rm',
            'cp',
            'mv',
            'rmdir',
            'head',
            'tail',
            'echo',
            'date',
            'whoami',
            'uname',
        ];

        // Debug: current CWD and raw input
        try {
            logger.debug('TERMINAL', '[TerminalSession] Tab on input', { input, cwd: this.vfsCwd });
        } catch {}

        // Command completion (first token).
        if (tokens.length <= 1 && !endsWithSpace) {
            const matches = availableCommands.filter(c => c.startsWith(cmd));
            try {
                logger.debug('TERMINAL', '[TerminalSession] Command matches', { cmd, matches });
            } catch {}
            if (matches.length === 1) {
                const match = matches[0];
                if (match !== undefined) {
                    this.inputElement.value = match + ' ';
                    this._syncInputMetrics();
                }
                return;
            }

            // If already complete command, add a trailing space.
            if (availableCommands.includes(cmd)) {
                this.inputElement.value = cmd + ' ';
                this._syncInputMetrics();
            }
            return;
        }

        // Argument completion (first argument only).
        // If user just typed a full command and pressed Tab, add a space.
        if (tokens.length === 1 && endsWithSpace && availableCommands.includes(cmd)) {
            this.inputElement.value = cmd + ' ';
            this._syncInputMetrics();
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
        const first = strings[0] ?? '';
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

        // Resolve directory context for matching. Accept absolute, relative, and ./ ../ prefixes.
        let dirForResolve: string;
        if (dirPrefix === '') {
            dirForResolve = this.vfsCwd;
        } else {
            const rawDir = dirPrefix.endsWith('/') ? dirPrefix.slice(0, -1) : dirPrefix;
            dirForResolve = this.vfsResolve(rawDir);
        }

        const folder = VirtualFS.getFolder(dirForResolve);
        try {
            logger.debug('TERMINAL', '[TerminalSession] Dir resolve', {
                rawArg,
                dirPrefix,
                basePrefix,
                dirForResolve,
                folderFound: !!folder,
            });
        } catch {}
        if (!folder) return;

        const entries = Object.entries(folder.children);
        const matches = entries
            .filter(([name, item]) => {
                if (!name.startsWith(basePrefix)) return false;
                if (item.type === 'folder') return opts.allowFolders;
                return opts.allowFiles;
            })
            .map(([name, item]) => ({ name, item }));

        try {
            logger.debug('TERMINAL', '[TerminalSession] Path matches', {
                cmd,
                basePrefix,
                count: matches.length,
                names: matches.map(m => m.name),
            });
        } catch {}
        if (matches.length === 0) return;

        const names = matches.map(m => m.name);

        if (matches.length === 1) {
            const m = matches[0]!;
            let completed = m.name;

            // For `cd`, append '/' to folders.
            if (cmd === 'cd' && m.item.type === 'folder' && !completed.endsWith('/')) {
                completed += '/';
            }

            this.inputElement.value = `${cmd} ${dirPrefix}${completed}`;
            this._syncInputMetrics();
            return;
        }

        // Multiple matches: extend to common prefix if possible.
        const common = this.findCommonPrefix(names);
        if (common.length > basePrefix.length) {
            this.inputElement.value = `${cmd} ${dirPrefix}${common}`;
            this._syncInputMetrics();
        } else {
            // If nothing to extend, show the list in output for UX feedback (like typical shells).
            try {
                const formatted = matches.map(
                    m => (m.item.type === 'folder' ? '📁 ' : '📄 ') + m.name
                );
                this.addOutput(
                    `guest@marvin:${this.vfsCwd}$ ${this.inputElement!.value}`,
                    'command'
                );
                this.addOutput(formatted.join('  '), 'info');
            } catch {}
        }
    }

    showWelcomeMessage(): void {
        this.addOutput('Willkommen im Terminal! Gib "help" ein für verfügbare Befehle.', 'info');
    }

    private tokenizeCommandLine(input: string): string[] {
        const tokens: string[] = [];
        let current = '';
        let quote: 'single' | 'double' | null = null;
        let escaped = false;

        for (let i = 0; i < input.length; i++) {
            const ch = input[i] ?? '';

            if (escaped) {
                // Preserve the backslash for shell-like literal behavior (e.g. "\\n" stays "\\n").
                current += `\\${ch}`;
                escaped = false;
                continue;
            }

            if (ch === '\\') {
                escaped = true;
                continue;
            }

            if (quote === 'single') {
                if (ch === "'") quote = null;
                else current += ch;
                continue;
            }

            if (quote === 'double') {
                if (ch === '"') quote = null;
                else current += ch;
                continue;
            }

            if (ch === "'") {
                quote = 'single';
                continue;
            }
            if (ch === '"') {
                quote = 'double';
                continue;
            }

            if (ch === '|' || ch === '<') {
                if (current.length > 0) {
                    tokens.push(current);
                    current = '';
                }
                tokens.push(ch);
                continue;
            }

            if (ch === '>') {
                if (current.length > 0) {
                    tokens.push(current);
                    current = '';
                }
                if (input[i + 1] === '>') {
                    tokens.push('>>');
                    i++;
                } else {
                    tokens.push('>');
                }
                continue;
            }

            if (/\s/.test(ch)) {
                if (current.length > 0) {
                    tokens.push(current);
                    current = '';
                }
                continue;
            }

            current += ch;
        }

        if (current.length > 0) tokens.push(current);
        return tokens;
    }

    private splitByPipe(tokens: string[]): string[][] {
        const segments: string[][] = [];
        let current: string[] = [];

        for (const token of tokens) {
            if (token === '|') {
                if (current.length === 0) return [];
                segments.push(current);
                current = [];
            } else {
                current.push(token);
            }
        }

        if (current.length === 0) return [];
        segments.push(current);
        return segments;
    }

    private parseSegmentRedirection(tokens: string[]): {
        argv: string[];
        inputPath?: string;
        outputPath?: string;
        append?: boolean;
        error?: string;
    } {
        const argv: string[] = [];
        let inputPath: string | undefined;
        let outputPath: string | undefined;
        let append = false;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i] ?? '';
            if (token === '<') {
                const next = tokens[i + 1];
                if (!next) return { argv, error: 'redirect: fehlender Pfad nach <' };
                inputPath = next;
                i++;
                continue;
            }

            if (token === '>' || token === '>>') {
                const next = tokens[i + 1];
                if (!next) {
                    return {
                        argv,
                        inputPath,
                        error: `redirect: fehlender Pfad nach ${token}`,
                    };
                }
                outputPath = next;
                append = token === '>>';
                i++;
                continue;
            }

            argv.push(token);
        }

        return { argv, inputPath, outputPath, append };
    }

    private dispatchCommand(cmd: string, args: string[], stdin?: string): boolean {
        const commands: Record<string, () => void> = {
            help: () => this.showHelp(),
            clear: () => this.clearOutput(),
            exit: () => this.exitShell(),
            ls: () => this.listDirectory(args),
            pwd: () => this.printWorkingDirectory(),
            cd: () => this.changeDirectory(args[0]),
            cat: () => this.catFile(args[0], stdin),
            touch: () => this.touch(args[0]),
            mkdir: () => this.mkdir(args),
            rm: () => this.rm(args),
            cp: () => this.cp(args),
            mv: () => this.mv(args),
            rmdir: () => this.rmdir(args),
            head: () => this.head(args, stdin),
            tail: () => this.tail(args, stdin),
            echo: () => this.echo(args.join(' ')),
            date: () => this.showDate(),
            whoami: () => this.addOutput('marvin', 'output'),
            uname: () => this.uname(args),
        };

        const fn = commands[cmd];
        if (!fn) return false;
        fn();
        return true;
    }

    private executeCommandCaptured(
        cmd: string,
        args: string[],
        stdin?: string
    ): { stdout: string[]; stderr: string[]; recognized: boolean } {
        const stdout: string[] = [];
        const stderr: string[] = [];
        const originalAddOutput = this.addOutput.bind(this);

        this.addOutput = (
            text: string,
            type: 'command' | 'output' | 'error' | 'info' = 'output'
        ): void => {
            if (type === 'error') stderr.push(text);
            else if (type !== 'command') stdout.push(text);
        };

        let recognized = false;
        try {
            recognized = this.dispatchCommand(cmd, args, stdin);
            if (!recognized) {
                stderr.push(
                    `Befehl nicht gefunden: ${cmd}. Gib "help" ein für verfügbare Befehle.`
                );
            }
        } finally {
            this.addOutput = originalAddOutput;
        }

        return { stdout, stderr, recognized };
    }

    private writeRedirectOutput(pathArg: string, content: string, append: boolean): boolean {
        const target = this.vfsResolve(pathArg);
        const parent = VirtualFS.getFolder(this.parentPath(target));
        if (!parent) {
            this.addOutput(
                `redirect: Verzeichnis nicht gefunden: ${this.parentPath(target)}`,
                'error'
            );
            return false;
        }

        const existing = VirtualFS.get(target);
        if (existing && existing.type === 'folder') {
            this.addOutput(`redirect: ${pathArg}: Ist ein Verzeichnis`, 'error');
            return false;
        }

        if (!existing) {
            if (!VirtualFS.createFile(target, content)) {
                this.addOutput(`redirect: Konnte nicht schreiben: ${pathArg}`, 'error');
                return false;
            }
            return true;
        }

        const current = (VirtualFS.getFile(target)?.content || '') as string;
        const next = append ? current + content : content;
        return VirtualFS.writeFile(target, next);
    }

    private executePipeline(tokens: string[]): boolean {
        const segments = this.splitByPipe(tokens);
        if (segments.length === 0) {
            this.addOutput('Syntaxfehler bei Pipeline', 'error');
            return true;
        }

        let stdinText: string | undefined;

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i] as string[];
            const parsed = this.parseSegmentRedirection(segment);
            if (parsed.error) {
                this.addOutput(parsed.error, 'error');
                return true;
            }

            if (i > 0 && parsed.inputPath) {
                this.addOutput('redirect: < nur im ersten Pipeline-Segment erlaubt', 'error');
                return true;
            }

            if (i < segments.length - 1 && parsed.outputPath) {
                this.addOutput(
                    'redirect: > oder >> nur im letzten Pipeline-Segment erlaubt',
                    'error'
                );
                return true;
            }

            if (parsed.inputPath) {
                const content = VirtualFS.readFile(this.vfsResolve(parsed.inputPath));
                if (content === null) {
                    this.addOutput(`redirect: Datei nicht gefunden: ${parsed.inputPath}`, 'error');
                    return true;
                }
                stdinText = content;
            }

            const [cmd, ...args] = parsed.argv;
            if (!cmd) {
                this.addOutput('Syntaxfehler: fehlender Befehl', 'error');
                return true;
            }

            const result = this.executeCommandCaptured(cmd, args, stdinText);
            if (result.stderr.length > 0) {
                result.stderr.forEach(line => this.addOutput(line, 'error'));
                return true;
            }

            const joined = result.stdout.join('\n');

            if (i === segments.length - 1) {
                if (parsed.outputPath) {
                    if (!this.writeRedirectOutput(parsed.outputPath, joined, !!parsed.append)) {
                        return true;
                    }
                    return true;
                }

                if (result.stdout.length === 0 && joined.length > 0) {
                    this.addOutput(joined, 'output');
                    return true;
                }

                result.stdout.forEach(line => this.addOutput(line, 'output'));
                return true;
            }

            stdinText = joined;
        }

        return true;
    }

    executeCommand(command: string): void {
        this.addOutput(`guest@marvin:${this.vfsCwd}$ ${command}`, 'command');
        const tokens = this.tokenizeCommandLine(command);
        const [cmd, ...args] = tokens;

        if (cmd === undefined) return;

        if (
            tokens.some(token => token === '|' || token === '<' || token === '>' || token === '>>')
        ) {
            this.executePipeline(tokens);
            this.commandHistory.push(command);
            this.historyIndex = this.commandHistory.length;
            this.updateContentState({ commandHistory: this.commandHistory });
            this._updateTabTitle(command);
            return;
        }

        const recognized = this.dispatchCommand(cmd, args);
        if (!recognized) {
            this.addOutput(
                `Befehl nicht gefunden: ${cmd}. Gib "help" ein für verfügbare Befehle.`,
                'error'
            );
        }

        // Add command to history for session persistence
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;
        this.updateContentState({ commandHistory: this.commandHistory });
        this._updateTabTitle(command);
    }

    addOutput(text: string, type: 'command' | 'output' | 'error' | 'info' = 'output'): void {
        // Map type to CSS classes
        const colorMap: Record<string, string> = {
            command: 'text-blue-400',
            output: 'text-green-400',
            error: 'text-red-400',
            info: 'text-yellow-400',
        };
        const className = `terminal-line terminal-${type} ${colorMap[type] || 'text-green-400'}`;

        // Create VNode for the new line
        const lineVNode = h(
            'div',
            {
                class: className,
                key: `line-${this._outputLines.length}`,
            },
            text
        );

        // Append to output lines array
        this._outputLines.push(lineVNode);

        // Directly append to DOM instead of full re-render
        // This avoids VDOM diffing issues and preserves input focus
        if (this.outputElement) {
            const lineElement = document.createElement('div');
            lineElement.className = className;
            lineElement.textContent = text;
            this.outputElement.appendChild(lineElement);

            // Auto-scroll to bottom after DOM update so the live prompt stays as the last line.
            requestAnimationFrame(() => {
                const scrollElement = this._getScrollElement();
                if (scrollElement) {
                    scrollElement.scrollTop = scrollElement.scrollHeight;
                }
            });
        } else {
            // Fallback: if output element not yet created, do full render
            this._renderTerminal();

            // Auto-scroll after full render
            const scrollElement = this._getScrollElement();
            if (scrollElement) {
                requestAnimationFrame(() => {
                    const liveScrollElement = this._getScrollElement();
                    if (liveScrollElement) {
                        liveScrollElement.scrollTop = liveScrollElement.scrollHeight;
                    }
                });
            }
        }
    }

    clearOutput(): void {
        // Clear output lines array
        this._outputLines = [];

        // Directly clear output element
        if (this.outputElement) {
            this.outputElement.innerHTML = '';
        } else {
            // Fallback: if output element not yet created, do full render
            this._renderTerminal();
        }
    }

    private exitShell(): void {
        // `exit` should terminate only this session/tab. BaseWindow handles
        // closing the entire window if this was the last remaining tab.
        if (this.parentWindow) {
            this.parentWindow.removeTab(this.id);
            return;
        }

        this.destroy();
    }

    showHelp(): void {
        const helpText = [
            'Verfügbare Befehle:',
            '  help     - Zeige diese Hilfe',
            '  clear    - Lösche Ausgabe',
            '  exit     - Beende die aktuelle Terminal-Sitzung',
            '  ls [-la] [pfad] - Liste Dateien',
            '  pwd      - Zeige aktuelles Verzeichnis',
            '  cd <dir> - Wechsle Verzeichnis',
            '  cat <f>  - Zeige Dateiinhalt',
            '  touch <f> [...] - Erstelle Datei oder aktualisiere Zeitstempel',
            '  mkdir [-p] <d> [...] - Erstelle Verzeichnis(se)',
            '  rm [-rf] <p> [...] - Lösche Datei/Verzeichnis',
            '  cp [-r] <src> <dst> - Kopiere Datei/Verzeichnis',
            '  mv <src> <dst> - Verschiebe/benenne um',
            '  rmdir [-p] <d> [...] - Entferne leere Verzeichnisse',
            '  head [-n N] [file] - Zeige erste Zeilen',
            '  tail [-n N] [file] - Zeige letzte Zeilen',
            '  echo <t> - Gebe Text aus',
            '  date     - Zeige Datum/Zeit',
            '  whoami   - Zeige Benutzername',
            '  uname [-a] - Zeige Systeminfo',
            '  Pipe/Redirect: cmd1 | cmd2, > file, >> file, < file',
        ];
        helpText.forEach(l => this.addOutput(l, 'info'));
    }

    listDirectory(args: string[] = []): void {
        let showLong = false;
        let targetPathArg: string | undefined;

        for (const arg of args) {
            if (arg.startsWith('-') && arg !== '-') {
                for (const flag of arg.slice(1)) {
                    if (flag === 'l') showLong = true;
                    else if (flag === 'a') {
                        // Hidden files are currently not modeled in VFS; accept flag as no-op.
                    } else {
                        this.addOutput(`ls: ungültige Option -- ${flag}`, 'error');
                        return;
                    }
                }
                continue;
            }

            if (targetPathArg === undefined) {
                targetPathArg = arg;
            } else {
                this.addOutput('ls: zu viele Operanden', 'error');
                return;
            }
        }

        const target = this.vfsResolve(targetPathArg);
        const item = VirtualFS.get(target);
        if (!item) {
            this.addOutput(
                `ls: ${targetPathArg || target}: Datei oder Verzeichnis nicht gefunden`,
                'error'
            );
            return;
        }
        if (item.type === 'file') {
            const fileName = target.split('/').pop() || target;
            if (showLong) {
                const size = item.size || 0;
                const modified = item.modified || new Date().toISOString();
                const stamp = new Date(modified).toLocaleString('de-DE');
                this.addOutput(
                    `-rw-r--r-- ${size.toString().padStart(6, ' ')} ${stamp} ${fileName}`
                );
            } else {
                this.addOutput('📄 ' + fileName, 'output');
            }
            return;
        }
        const entries = VirtualFS.list(target);
        const names = Object.keys(entries).sort((a, b) => a.localeCompare(b));
        if (names.length === 0) {
            this.addOutput('(leer)', 'output');
            return;
        }
        names.forEach(name => {
            const child = entries[name];
            if (child) {
                if (showLong) {
                    const perms = child.type === 'folder' ? 'drwxr-xr-x' : '-rw-r--r--';
                    const size = child.type === 'file' ? child.size || 0 : 0;
                    const modified = child.modified || new Date().toISOString();
                    const stamp = new Date(modified).toLocaleString('de-DE');
                    const displayName = child.type === 'folder' ? `${name}/` : name;
                    this.addOutput(
                        `${perms} ${size.toString().padStart(6, ' ')} ${stamp} ${displayName}`,
                        'output'
                    );
                } else {
                    const prefix = child.type === 'folder' ? '📁 ' : '📄 ';
                    this.addOutput(prefix + name, 'output');
                }
            }
        });
    }

    printWorkingDirectory(): void {
        this.addOutput(this.vfsCwd, 'output');
    }

    changeDirectory(path?: string): void {
        const requested = (path || '').trim();
        const current = this.vfsCwd;

        if (requested === '-') {
            const target = this.previousVfsCwd || '/home/marvin';
            const folder = VirtualFS.getFolder(target);
            if (!folder) {
                this.addOutput(`cd: Verzeichnis nicht gefunden: ${target}`, 'error');
                return;
            }

            this.vfsCwd = target;
            this.previousVfsCwd = current;
            this.updatePrompt();
            this.updateContentState({ currentPath: this.vfsCwd, vfsCwd: this.vfsCwd });
            this._updateTabTitle();
            return;
        }

        const target = this.vfsResolve(path || '/home/marvin');
        const folder = VirtualFS.getFolder(target);
        if (!folder) {
            this.addOutput(`Verzeichnis nicht gefunden: ${path || target}`, 'error');
            return;
        }
        this.vfsCwd = target;
        this.previousVfsCwd = current;
        this.updatePrompt();
        this.updateContentState({ currentPath: this.vfsCwd, vfsCwd: this.vfsCwd });
        this._updateTabTitle();
    }

    catFile(filename?: string, stdin?: string): void {
        if (!filename) {
            if (typeof stdin === 'string') {
                this.addOutput(stdin, 'output');
                return;
            }
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

    head(args: string[] = [], stdin?: string): void {
        let lineCount = 10;
        let pathArg: string | undefined;

        for (let i = 0; i < args.length; i++) {
            const arg = args[i] ?? '';
            if (arg === '-n') {
                const val = Number(args[i + 1]);
                if (!Number.isFinite(val) || val < 0) {
                    this.addOutput('head: ungültige Zeilenanzahl', 'error');
                    return;
                }
                lineCount = Math.floor(val);
                i++;
                continue;
            }

            if (arg.startsWith('-n') && arg.length > 2) {
                const val = Number(arg.slice(2));
                if (!Number.isFinite(val) || val < 0) {
                    this.addOutput('head: ungültige Zeilenanzahl', 'error');
                    return;
                }
                lineCount = Math.floor(val);
                continue;
            }

            if (!pathArg) pathArg = arg;
            else {
                this.addOutput('head: zu viele Operanden', 'error');
                return;
            }
        }

        const content =
            pathArg !== undefined
                ? VirtualFS.readFile(this.vfsResolve(pathArg))
                : typeof stdin === 'string'
                  ? stdin
                  : null;

        if (content === null) {
            this.addOutput('head: Datei nicht gefunden oder keine Eingabe', 'error');
            return;
        }

        const lines = content.split(/\r?\n/).slice(0, lineCount);
        lines.forEach(line => this.addOutput(line, 'output'));
    }

    tail(args: string[] = [], stdin?: string): void {
        let lineCount = 10;
        let pathArg: string | undefined;

        for (let i = 0; i < args.length; i++) {
            const arg = args[i] ?? '';
            if (arg === '-n') {
                const val = Number(args[i + 1]);
                if (!Number.isFinite(val) || val < 0) {
                    this.addOutput('tail: ungültige Zeilenanzahl', 'error');
                    return;
                }
                lineCount = Math.floor(val);
                i++;
                continue;
            }

            if (arg.startsWith('-n') && arg.length > 2) {
                const val = Number(arg.slice(2));
                if (!Number.isFinite(val) || val < 0) {
                    this.addOutput('tail: ungültige Zeilenanzahl', 'error');
                    return;
                }
                lineCount = Math.floor(val);
                continue;
            }

            if (!pathArg) pathArg = arg;
            else {
                this.addOutput('tail: zu viele Operanden', 'error');
                return;
            }
        }

        const content =
            pathArg !== undefined
                ? VirtualFS.readFile(this.vfsResolve(pathArg))
                : typeof stdin === 'string'
                  ? stdin
                  : null;

        if (content === null) {
            this.addOutput('tail: Datei nicht gefunden oder keine Eingabe', 'error');
            return;
        }

        const lines = content.split(/\r?\n/);
        lines.slice(Math.max(lines.length - lineCount, 0)).forEach(line => this.addOutput(line));
    }

    uname(args: string[] = []): void {
        const showAll = args.includes('-a');
        if (showAll) {
            this.addOutput(
                'Darwin portfolio.local 23.0.0 Darwin Kernel Version 23.0.0: VirtualFS x86_64',
                'output'
            );
            return;
        }
        this.addOutput('Darwin', 'output');
    }

    updatePrompt(): void {
        // Update prompt element directly without full VDOM re-render
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
            if (existing.type === 'folder') {
                this.addOutput(`touch: ${target}: Ist ein Verzeichnis`, 'error');
                return;
            }
            // Unix-like touch behavior: update mtime when file already exists.
            VirtualFS.writeFile(target, existing.content);
            return;
        }

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

    mkdir(args: string[] | string): void {
        const argv = Array.isArray(args) ? args : args ? [args] : [];
        let createParents = false;
        const operands: string[] = [];

        for (const arg of argv) {
            if (arg.startsWith('-') && arg !== '-') {
                for (const flag of arg.slice(1)) {
                    if (flag === 'p') createParents = true;
                    else {
                        this.addOutput(`mkdir: ungültige Option -- ${flag}`, 'error');
                        return;
                    }
                }
            } else {
                operands.push(arg);
            }
        }

        if (operands.length === 0) {
            this.addOutput('mkdir: fehlender Operand', 'error');
            return;
        }

        for (const operand of operands) {
            const target = this.vfsResolve(operand);

            if (createParents) {
                const parts = target.split('/').filter(Boolean);
                let current = '/';
                let failed = false;
                for (const part of parts) {
                    const next = current === '/' ? `/${part}` : `${current}/${part}`;
                    const item = VirtualFS.get(next);
                    if (!item) {
                        if (!VirtualFS.createFolder(next)) {
                            this.addOutput(`Konnte Verzeichnis nicht erstellen: ${next}`, 'error');
                            failed = true;
                            break;
                        }
                    } else if (item.type !== 'folder') {
                        this.addOutput(`mkdir: ${next}: Kein Verzeichnis`, 'error');
                        failed = true;
                        break;
                    }
                    current = next;
                }
                if (failed) return;
                continue;
            }

            const parts = target.split('/');
            const name = parts.pop() as string;
            const parentPath = parts.join('/');
            const parent = VirtualFS.getFolder(parentPath);
            if (!parent) {
                this.addOutput(`Übergeordnetes Verzeichnis nicht gefunden: ${parentPath}`, 'error');
                return;
            }
            const ok = VirtualFS.createFolder([...parts, name].join('/'));
            if (!ok) {
                this.addOutput(`Konnte Verzeichnis nicht erstellen: ${target}`, 'error');
                return;
            }
        }
    }

    rm(args: string[] | string): void {
        const argv = Array.isArray(args) ? args : args ? [args] : [];
        let recursive = false;
        let force = false;
        const operands: string[] = [];

        for (const arg of argv) {
            if (arg.startsWith('-') && arg !== '-') {
                for (const flag of arg.slice(1)) {
                    if (flag === 'r' || flag === 'R') recursive = true;
                    else if (flag === 'f') force = true;
                    else {
                        this.addOutput(`rm: ungültige Option -- ${flag}`, 'error');
                        return;
                    }
                }
            } else {
                operands.push(arg);
            }
        }

        if (operands.length === 0) {
            this.addOutput('rm: fehlender Operand', 'error');
            return;
        }

        for (const operand of operands) {
            const target = this.vfsResolve(operand);
            const item = VirtualFS.get(target);
            if (!item) {
                if (!force) {
                    this.addOutput(
                        `rm: ${operand}: Datei oder Verzeichnis nicht gefunden`,
                        'error'
                    );
                }
                continue;
            }

            if (item.type === 'folder' && !recursive) {
                this.addOutput(`rm: ${operand}: ist ein Verzeichnis (nutze -r)`, 'error');
                continue;
            }

            const ok = VirtualFS.delete(target);
            if (!ok && !force) this.addOutput(`Konnte nicht löschen: ${target}`, 'error');
        }
    }

    cp(args: string[]): void {
        let recursive = false;
        const operands: string[] = [];

        for (const arg of args) {
            if (arg.startsWith('-') && arg !== '-') {
                for (const flag of arg.slice(1)) {
                    if (flag === 'r' || flag === 'R') recursive = true;
                    else {
                        this.addOutput(`cp: ungültige Option -- ${flag}`, 'error');
                        return;
                    }
                }
            } else {
                operands.push(arg);
            }
        }

        if (operands.length !== 2) {
            this.addOutput('cp: erwartet genau 2 Operanden: <src> <dst>', 'error');
            return;
        }

        const src = this.vfsResolve(operands[0]);
        const dstRaw = this.vfsResolve(operands[1]);
        const srcItem = VirtualFS.get(src);
        if (!srcItem) {
            this.addOutput(`cp: Quelle nicht gefunden: ${operands[0]}`, 'error');
            return;
        }

        if (srcItem.type === 'folder' && !recursive) {
            this.addOutput('cp: Verzeichnis nur mit -r kopierbar', 'error');
            return;
        }

        const srcBase = src.split('/').filter(Boolean).pop() || '';
        const dstItem = VirtualFS.get(dstRaw);
        const dst = dstItem?.type === 'folder' ? `${dstRaw}/${srcBase}` : dstRaw;

        if (srcItem.type === 'file') {
            const parent = VirtualFS.getFolder(this.parentPath(dst));
            if (!parent) {
                this.addOutput(
                    `cp: Zielverzeichnis nicht gefunden: ${this.parentPath(dst)}`,
                    'error'
                );
                return;
            }

            const existing = VirtualFS.get(dst);
            if (existing) {
                if (existing.type === 'folder') {
                    this.addOutput(`cp: Ziel ist ein Verzeichnis: ${dst}`, 'error');
                    return;
                }
                VirtualFS.delete(dst);
            }

            if (!VirtualFS.createFile(dst, srcItem.content, srcItem.icon || '📝')) {
                this.addOutput(`cp: Konnte Datei nicht kopieren: ${dst}`, 'error');
            }
            return;
        }

        this.copyFolderRecursive(src, dst);
    }

    private copyFolderRecursive(srcPath: string, dstPath: string): void {
        const srcFolder = VirtualFS.getFolder(srcPath);
        if (!srcFolder) {
            this.addOutput(`cp: Quelle ist kein Verzeichnis: ${srcPath}`, 'error');
            return;
        }

        const existingDst = VirtualFS.get(dstPath);
        if (existingDst && existingDst.type !== 'folder') {
            VirtualFS.delete(dstPath);
        }
        if (!existingDst && !VirtualFS.createFolder(dstPath, srcFolder.icon || '📁')) {
            this.addOutput(`cp: Konnte Zielverzeichnis nicht erstellen: ${dstPath}`, 'error');
            return;
        }

        const children = VirtualFS.list(srcPath);
        for (const [name, child] of Object.entries(children)) {
            const srcChild = `${srcPath}/${name}`;
            const dstChild = `${dstPath}/${name}`;

            if (child.type === 'file') {
                const existing = VirtualFS.get(dstChild);
                if (existing) VirtualFS.delete(dstChild);
                VirtualFS.createFile(dstChild, child.content, child.icon || '📝');
            } else {
                this.copyFolderRecursive(srcChild, dstChild);
            }
        }
    }

    mv(args: string[]): void {
        if (args.length !== 2) {
            this.addOutput('mv: erwartet genau 2 Operanden: <src> <dst>', 'error');
            return;
        }

        const src = this.vfsResolve(args[0]);
        const dstRaw = this.vfsResolve(args[1]);
        const srcItem = VirtualFS.get(src);
        if (!srcItem) {
            this.addOutput(`mv: Quelle nicht gefunden: ${args[0]}`, 'error');
            return;
        }

        const srcBase = src.split('/').filter(Boolean).pop() || '';
        const dstItem = VirtualFS.get(dstRaw);
        const dst = dstItem?.type === 'folder' ? `${dstRaw}/${srcBase}` : dstRaw;

        if (srcItem.type === 'folder' && (dst === src || dst.startsWith(src + '/'))) {
            this.addOutput('mv: Ziel liegt innerhalb der Quelle', 'error');
            return;
        }

        if (srcItem.type === 'file') {
            const parent = VirtualFS.getFolder(this.parentPath(dst));
            if (!parent) {
                this.addOutput(
                    `mv: Zielverzeichnis nicht gefunden: ${this.parentPath(dst)}`,
                    'error'
                );
                return;
            }

            const existing = VirtualFS.get(dst);
            if (existing) VirtualFS.delete(dst);

            if (!VirtualFS.createFile(dst, srcItem.content, srcItem.icon || '📝')) {
                this.addOutput(`mv: Konnte Ziel nicht erstellen: ${dst}`, 'error');
                return;
            }

            VirtualFS.delete(src);
            return;
        }

        this.copyFolderRecursive(src, dst);
        VirtualFS.delete(src);
    }

    rmdir(args: string[]): void {
        let removeParents = false;
        const operands: string[] = [];

        for (const arg of args) {
            if (arg.startsWith('-') && arg !== '-') {
                for (const flag of arg.slice(1)) {
                    if (flag === 'p') removeParents = true;
                    else {
                        this.addOutput(`rmdir: ungültige Option -- ${flag}`, 'error');
                        return;
                    }
                }
            } else {
                operands.push(arg);
            }
        }

        if (operands.length === 0) {
            this.addOutput('rmdir: fehlender Operand', 'error');
            return;
        }

        for (const operand of operands) {
            let target = this.vfsResolve(operand);
            while (true) {
                const dir = VirtualFS.getFolder(target);
                if (!dir) {
                    this.addOutput(`rmdir: Verzeichnis nicht gefunden: ${target}`, 'error');
                    break;
                }

                if (Object.keys(dir.children || {}).length > 0) {
                    this.addOutput(`rmdir: Verzeichnis nicht leer: ${target}`, 'error');
                    break;
                }

                if (!VirtualFS.delete(target)) {
                    this.addOutput(`rmdir: Konnte nicht löschen: ${target}`, 'error');
                    break;
                }

                if (!removeParents) break;
                const parent = this.parentPath(target);
                if (parent === '/' || parent === '/home') break;
                target = parent;
            }
        }
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
    serialize(): TabState {
        return {
            ...super.serialize(),
            currentPath: this.vfsCwd,
            commandHistory: this.commandHistory,
            vfsCwd: this.vfsCwd,
            previousVfsCwd: this.previousVfsCwd,
            lastExecutedCommand: this.lastExecutedCommand,
        } as TabState;
    }

    static deserialize(state: TabState & Record<string, unknown>): TerminalSession {
        const session = new TerminalSession({
            id: state['id'] as string | undefined,
            title: state['title'] as string | undefined,
        });

        // Use vfsCwd if available, otherwise fall back to currentPath
        if (state['vfsCwd']) {
            session.vfsCwd = state['vfsCwd'] as string;
        } else if (state['currentPath']) {
            session.vfsCwd = state['currentPath'] as string;
        }

        if (typeof state['previousVfsCwd'] === 'string') {
            session.previousVfsCwd = state['previousVfsCwd'] as string;
        }

        if (state['commandHistory']) {
            session.commandHistory = state['commandHistory'] as string[];
            session.historyIndex = session.commandHistory.length;
        }

        if (typeof state['lastExecutedCommand'] === 'string') {
            session.lastExecutedCommand = state['lastExecutedCommand'] as string;
        } else if (session.commandHistory.length > 0) {
            const lastCommand = session.commandHistory[session.commandHistory.length - 1];
            if (typeof lastCommand === 'string' && lastCommand.trim()) {
                session.lastExecutedCommand = lastCommand;
            }
        }

        session._updateTabTitle();

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
window.TerminalSession = TerminalSession;
