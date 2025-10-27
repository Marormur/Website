/**
 * Text Editor Module
 * Replaces text.html iframe with inline text editor
 */

type WrapMode = 'soft' | 'off';

interface FileMeta {
    fileName?: string;
    repo?: string;
    path?: string;
}

interface RemoteFilePayload extends FileMeta {
    content: string;
}

interface LoadErrorPayload extends FileMeta {
    message?: string;
}

type StatusState =
    | { type: 'plain'; text: string }
    | { type: 'i18n'; key: string; params?: Record<string, unknown> };

interface TextEditorSystemInternal extends TextEditorSystemAPI {
    container: HTMLElement | null;
    editor: HTMLTextAreaElement | null;
    statusBar: HTMLElement | null;
    saveButton: HTMLButtonElement | null;
    fileInput: HTMLInputElement | null;
    wrapMode: WrapMode;
    currentRemoteFile: RemoteFilePayload | null;
    statusState: StatusState | null;
    wordCountDisplay: HTMLElement | null;
    lineColDisplay: HTMLElement | null;
    findReplacePanel: HTMLElement | null;
    findInput: HTMLInputElement | null;
    replaceInput: HTMLInputElement | null;
    toastContainer: HTMLElement | null;
}

const TextEditorSystem: TextEditorSystemInternal = {
    container: null,
    editor: null,
    statusBar: null,
    saveButton: null,
    fileInput: null,
    wrapMode: 'off',
    currentRemoteFile: null,
    statusState: null,
    wordCountDisplay: null,
    lineColDisplay: null,
    findReplacePanel: null,
    findInput: null,
    replaceInput: null,
    toastContainer: null,

        /**
         * Initialize text editor in container
         * @param {HTMLElement|string} containerOrId - Container element or ID
         */
        init(containerOrId: HTMLElement | string): void {
            const container =
                typeof containerOrId === 'string'
                    ? document.getElementById(containerOrId)
                    : containerOrId;

            if (!container) {
                console.error('Text editor container not found:', containerOrId);
                return;
            }

            this.container = container;
            this.render();
            this.cacheElements();
            this.loadWrapPreference();
            this.attachListeners();
            this.loadSavedContent();
            this.syncSaveButtonState();

            // Register text editor actions with ActionBus
            if (window.ActionBus) {
                this.registerActions();
            }
        },

        /**
         * Render text editor UI
         */
        render(): void {
            if (!this.container) return;

            this.container.innerHTML = `
                <div class="dialog-content flex flex-col h-full" style="background: var(--editor-body-bg, #fafafa); color: var(--editor-text, #111827);">
                    <!-- File Operations Toolbar -->
                    <div id="text-toolbar" class="flex-none" style="background: var(--editor-toolbar-bg, #f5f5f5); padding: 8px 12px; border-bottom: 1px solid var(--editor-toolbar-border, #d1d5db); display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <button type="button" data-action="textEditor:clear" class="text-editor-btn" data-i18n="textEditor.toolbar.clear" data-i18n-title="textEditor.toolbar.clear">Neu</button>
                        <button type="button" data-action="textEditor:open" class="text-editor-btn" data-i18n="textEditor.toolbar.open" data-i18n-title="textEditor.toolbar.open">Öffnen</button>
                        <button type="button" data-action="textEditor:save" class="text-editor-btn" id="text-save-button" data-i18n="textEditor.toolbar.save" data-i18n-title="textEditor.toolbar.save">Speichern</button>
                        <div style="width: 1px; height: 20px; background: var(--editor-toolbar-border, #d1d5db); margin: 0 4px;"></div>
                        <button type="button" data-action="textEditor:bold" class="text-editor-btn" data-i18n-title="textEditor.toolbar.bold" style="font-weight: bold;">B</button>
                        <button type="button" data-action="textEditor:italic" class="text-editor-btn" data-i18n-title="textEditor.toolbar.italic" style="font-style: italic;">I</button>
                        <button type="button" data-action="textEditor:underline" class="text-editor-btn" data-i18n-title="textEditor.toolbar.underline" style="text-decoration: underline;">U</button>
                        <button type="button" data-action="textEditor:strikethrough" class="text-editor-btn" data-i18n-title="textEditor.toolbar.strikeThrough" style="text-decoration: line-through;">S</button>
                        <div style="width: 1px; height: 20px; background: var(--editor-toolbar-border, #d1d5db); margin: 0 4px;"></div>
                        <button type="button" data-action="textEditor:heading1" class="text-editor-btn" data-i18n-title="textEditor.toolbar.heading1">H1</button>
                        <button type="button" data-action="textEditor:heading2" class="text-editor-btn" data-i18n-title="textEditor.toolbar.heading2">H2</button>
                        <button type="button" data-action="textEditor:heading3" class="text-editor-btn" data-i18n-title="textEditor.toolbar.heading3">H3</button>
                        <div style="width: 1px; height: 20px; background: var(--editor-toolbar-border, #d1d5db); margin: 0 4px;"></div>
                        <button type="button" data-action="textEditor:unorderedList" class="text-editor-btn" data-i18n-title="textEditor.toolbar.unorderedList">• List</button>
                        <button type="button" data-action="textEditor:orderedList" class="text-editor-btn" data-i18n-title="textEditor.toolbar.orderedList">1. List</button>
                        <div style="width: 1px; height: 20px; background: var(--editor-toolbar-border, #d1d5db); margin: 0 4px;"></div>
                        <button type="button" data-action="textEditor:alignLeft" class="text-editor-btn" data-i18n-title="textEditor.toolbar.alignLeft">⇤</button>
                        <button type="button" data-action="textEditor:alignCenter" class="text-editor-btn" data-i18n-title="textEditor.toolbar.alignCenter">≡</button>
                        <button type="button" data-action="textEditor:alignRight" class="text-editor-btn" data-i18n-title="textEditor.toolbar.alignRight">⇥</button>
                        <div style="width: 1px; height: 20px; background: var(--editor-toolbar-border, #d1d5db); margin: 0 4px;"></div>
                        <button type="button" data-action="textEditor:insertLink" class="text-editor-btn" data-i18n-title="textEditor.toolbar.insertLink">🔗</button>
                        <button type="button" data-action="textEditor:findReplace" class="text-editor-btn" data-i18n-title="textEditor.toolbar.findReplace">🔍</button>
                        <input type="file" id="text-file-input"
                            accept=".txt,.md,.markdown,.html,.htm,.css,.scss,.js,.jsx,.ts,.tsx,.json,.yml,.yaml,.xml,.csv,.tsv,.ini,.cfg,.conf,.env,.gitignore,.log,.c,.h,.cpp,.hpp,.java,.kt,.swift,.cs,.py,.rb,.php,.rs,.go,.sh,.bash,.zsh,.fish,.ps1,.bat"
                            style="display:none">
                    </div>
                    <!-- Find and Replace Panel (Hidden by default) -->
                    <div id="find-replace-panel" class="flex-none" style="background: var(--editor-toolbar-bg, #f5f5f5); padding: 8px 12px; border-bottom: 1px solid var(--editor-toolbar-border, #d1d5db); display: none; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <input type="text" id="find-input" data-i18n-placeholder="textEditor.findReplace.find" placeholder="Find..." style="padding: 4px 8px; border: 1px solid var(--editor-toolbar-border, #d1d5db); border-radius: 4px; background: var(--editor-surface-bg, #ffffff); color: var(--editor-text, #111827); font-size: 13px;">
                        <input type="text" id="replace-input" data-i18n-placeholder="textEditor.findReplace.replace" placeholder="Replace..." style="padding: 4px 8px; border: 1px solid var(--editor-toolbar-border, #d1d5db); border-radius: 4px; background: var(--editor-surface-bg, #ffffff); color: var(--editor-text, #111827); font-size: 13px;">
                        <button type="button" data-action="textEditor:findNext" class="text-editor-btn" data-i18n="textEditor.findReplace.next" data-i18n-title="textEditor.findReplace.next" style="font-size: 12px;">Next</button>
                        <button type="button" data-action="textEditor:replaceOne" class="text-editor-btn" data-i18n="textEditor.findReplace.replaceOne" data-i18n-title="textEditor.findReplace.replaceOne" style="font-size: 12px;">Replace</button>
                        <button type="button" data-action="textEditor:replaceAll" class="text-editor-btn" data-i18n="textEditor.findReplace.replaceAll" data-i18n-title="textEditor.findReplace.replaceAll" style="font-size: 12px;">Replace All</button>
                        <button type="button" data-action="textEditor:closeFindReplace" class="text-editor-btn" data-i18n="textEditor.findReplace.close" data-i18n-title="textEditor.findReplace.close" style="font-size: 12px;">✕</button>
                    </div>
                    <div id="text-file-status" class="flex-none" style="padding: 8px 16px; border-bottom: 1px solid var(--editor-toolbar-border, #d1d5db); background: var(--editor-body-bg, #fafafa); color: var(--editor-text, #111827); font-size: 14px; opacity: 0.75; display: none;"></div>
                    <textarea id="text-editor-textarea" spellcheck="false" wrap="off" class="flex-1 w-full resize-none p-4 border-0 outline-none"
                        style="background: var(--editor-surface-bg, #ffffff); color: inherit; font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 14px; line-height: 1.6; tab-size: 4;"
                        title="textarea"></textarea>
                    <!-- Status Bar with Word Count -->
                    <div id="word-count-bar" class="flex-none" style="background: var(--editor-toolbar-bg, #f5f5f5); padding: 6px 12px; border-top: 1px solid var(--editor-toolbar-border, #d1d5db); font-size: 12px; color: var(--editor-text, #111827); opacity: 0.75; display: flex; justify-content: space-between;">
                        <span id="word-count-display" data-i18n="textEditor.status.wordCount" data-i18n-params='{"words":0,"chars":0}'>Words: 0 | Characters: 0</span>
                        <span id="line-col-display" data-i18n="textEditor.status.position" data-i18n-params='{"line":1,"col":1}'>Line 1, Col 1</span>
                    </div>
                </div>
            `;

            // Apply CSS variables for dark mode support
            this.updateCSSVariables();

            // Apply i18n translations
            if (window.appI18n && typeof window.appI18n.applyTranslations === 'function') {
                window.appI18n.applyTranslations(this.container);
            }
        },

        /**
         * Update CSS variables for dark mode
         */
        updateCSSVariables(): void {
            if (!this.container) return;

            const isDark = document.documentElement.classList.contains('dark');

            this.container.style.setProperty('--editor-body-bg', isDark ? '#0f172a' : '#fafafa');
            this.container.style.setProperty('--editor-text', isDark ? '#e5e7eb' : '#111827');
            this.container.style.setProperty('--editor-toolbar-bg', isDark ? '#1f2937' : '#f5f5f5');
            this.container.style.setProperty(
                '--editor-toolbar-border',
                isDark ? '#374151' : '#d1d5db'
            );
            this.container.style.setProperty(
                '--editor-toolbar-button-bg',
                isDark ? '#111827' : '#ffffff'
            );
            this.container.style.setProperty(
                '--editor-toolbar-button-hover',
                isDark ? '#1f2937' : '#e5e7eb'
            );
            this.container.style.setProperty(
                '--editor-toolbar-button-border',
                isDark ? '#475569' : '#d1d5db'
            );
            this.container.style.setProperty('--editor-surface-bg', isDark ? '#111827' : '#ffffff');

            // Apply button styles
            const buttons = this.container.querySelectorAll<HTMLElement>('.text-editor-btn');
            buttons.forEach(btn => {
                btn.style.margin = '0';
                btn.style.padding = '6px 12px';
                btn.style.fontSize = '14px';
                btn.style.border = `1px solid ${isDark ? '#475569' : '#d1d5db'}`;
                btn.style.background = isDark ? '#111827' : '#ffffff';
                btn.style.cursor = 'pointer';
                btn.style.color = 'inherit';
                btn.style.borderRadius = '6px';
            });
        },

        /**
         * Cache DOM elements
         */
        cacheElements(): void {
            if (!this.container) return;

            this.editor = this.container.querySelector<HTMLTextAreaElement>(
                '#text-editor-textarea'
            );
            this.statusBar = this.container.querySelector<HTMLElement>('#text-file-status');
            this.saveButton = this.container.querySelector<HTMLButtonElement>('#text-save-button');
            this.fileInput = this.container.querySelector<HTMLInputElement>('#text-file-input');
            this.wordCountDisplay = this.container.querySelector<HTMLElement>(
                '#word-count-display'
            );
            this.lineColDisplay = this.container.querySelector<HTMLElement>('#line-col-display');
            this.findReplacePanel = this.container.querySelector<HTMLElement>(
                '#find-replace-panel'
            );
            this.findInput = this.container.querySelector<HTMLInputElement>('#find-input');
            this.replaceInput = this.container.querySelector<HTMLInputElement>('#replace-input');
        },

        /**
         * Load wrap mode preference
         */
        loadWrapPreference(): void {
            const storedWrapMode = localStorage.getItem('textEditorWrapMode');
            this.wrapMode = storedWrapMode === 'soft' ? 'soft' : 'off';
            this.applyWrapMode(this.wrapMode);
        },

        /**
         * Apply wrap mode
         * @param {string} mode - Wrap mode (soft|off)
         */
        applyWrapMode(mode: string): void {
            if (!this.editor) return;

            const normalized = mode === 'soft' ? 'soft' : 'off';
            this.wrapMode = normalized;
            this.editor.wrap = normalized;
            this.editor.style.whiteSpace = normalized === 'soft' ? 'pre-wrap' : 'pre';

            try {
                localStorage.setItem('textEditorWrapMode', normalized);
            } catch (err) {
                console.warn('Wrap preference could not be stored:', err);
            }
        },

        /**
         * Toggle wrap mode
         */
        toggleWrapMode(): void {
            const next = this.wrapMode === 'soft' ? 'off' : 'soft';
            this.applyWrapMode(next);
            this.setStatusPlain(
                next === 'soft' ? 'Zeilenumbruch aktiviert' : 'Zeilenumbruch deaktiviert'
            );
            this.focusEditor();
        },

        /**
         * Attach event listeners
         */
        attachListeners(): void {
            if (!this.editor || !this.fileInput) return;

            // Editor input listener for auto-save and word count
            this.editor.addEventListener('input', () => {
                this.handleEditorInput();
                this.updateWordCount();
            });

            // Editor selection and cursor listener
            this.editor.addEventListener('click', () => {
                this.updateCursorPosition();
            });

            this.editor.addEventListener('keyup', () => {
                this.updateCursorPosition();
            });

            // File input change listener
            this.fileInput.addEventListener('change', event => {
                this.handleFileSelect(event);
            });

            // Listen for theme changes to update CSS variables
            const themeObserver = new MutationObserver(() => {
                this.updateCSSVariables();
            });
            themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class'],
            });

            // Listen for language changes
            window.addEventListener('languagePreferenceChange', () => {
                this.updateDocumentTitle();
                this.applyStatusState();
            });

            // Initial word count and cursor position
            this.updateWordCount();
            this.updateCursorPosition();
        },

        /**
         * Register actions with ActionBus
         */
        registerActions(): void {
            if (!window.ActionBus) return;

            window.ActionBus.registerAll({
                'textEditor:clear': () => this.clearEditor(),
                'textEditor:open': () => this.openFile(),
                'textEditor:save': () => this.saveFile(),
                'textEditor:toggleWrap': () => this.toggleWrapMode(),
                'textEditor:undo': () => this.execCommand('undo'),
                'textEditor:redo': () => this.execCommand('redo'),
                'textEditor:cut': () => this.execCommand('cut'),
                'textEditor:copy': () => this.execCommand('copy'),
                'textEditor:paste': () => this.handlePaste(),
                'textEditor:selectAll': () => this.selectAll(),
                // New formatting actions
                'textEditor:bold': () => this.wrapSelection('**', '**'),
                'textEditor:italic': () => this.wrapSelection('*', '*'),
                'textEditor:underline': () => this.wrapSelection('<u>', '</u>'),
                'textEditor:strikethrough': () => this.wrapSelection('~~', '~~'),
                'textEditor:heading1': () => this.insertHeading(1),
                'textEditor:heading2': () => this.insertHeading(2),
                'textEditor:heading3': () => this.insertHeading(3),
                'textEditor:unorderedList': () => this.insertList('unordered'),
                'textEditor:orderedList': () => this.insertList('ordered'),
                'textEditor:alignLeft': () => this.alignText('left'),
                'textEditor:alignCenter': () => this.alignText('center'),
                'textEditor:alignRight': () => this.alignText('right'),
                'textEditor:insertLink': () => this.insertLink(),
                'textEditor:findReplace': () => this.toggleFindReplace(),
                'textEditor:findNext': () => this.findNext(),
                'textEditor:replaceOne': () => this.replaceOne(),
                'textEditor:replaceAll': () => this.replaceAll(),
                'textEditor:closeFindReplace': () => this.closeFindReplace(),
            });
        },

        /**
         * Handle editor input
         */
        handleEditorInput(): void {
            if (!this.editor) return;

            try {
                localStorage.setItem('textEditorContent', this.editor.value);
            } catch (err) {
                console.warn('Could not save editor content to localStorage:', err);
            }

            this.syncSaveButtonState();
        },

        /**
         * Handle file selection
         */
        handleFileSelect(event: Event): void {
            const input = event.target as HTMLInputElement | null;
            const file = input?.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                const content = e.target?.result;
                if (typeof content === 'string' && this.editor) {
                    this.editor.value = content;
                    this.updateWordCount();
                    this.updateCursorPosition();
                }
                this.currentRemoteFile = { fileName: file.name };
                this.updateDocumentTitle();
                this.setStatusPlain(file.name);
                this.syncSaveButtonState();
                this.focusEditor();
            };
            reader.readAsText(file);

            // Reset input for future opens
            if (input) {
                input.value = '';
            }
        },

        /**
         * Load saved content from localStorage
         */
        loadSavedContent(): void {
            if (!this.editor) return;

            try {
                const saved = localStorage.getItem('textEditorContent');
                if (saved) {
                    this.editor.value = saved;
                    this.updateWordCount();
                    this.updateCursorPosition();
                }
            } catch (err) {
                console.warn('Could not load saved content:', err);
            }
        },

        /**
         * Sync save button state
         */
        syncSaveButtonState(): void {
            if (!this.saveButton || !this.editor) return;

            this.saveButton.disabled = this.editor.value.length === 0;
        },

        /**
         * Focus editor
         */
        focusEditor(): void {
            if (this.editor) {
                this.editor.focus();
            }
        },

        /**
         * Clear editor
         */
        clearEditor(): void {
            if (!this.editor) return;

            this.editor.value = '';
            this.updateWordCount();
            this.updateCursorPosition();
            localStorage.removeItem('textEditorContent');
            this.currentRemoteFile = null;
            this.updateDocumentTitle();
            this.clearStatus();
            this.syncSaveButtonState();
            this.focusEditor();
        },

        /**
         * Open file picker
         */
        openFile(): void {
            if (this.fileInput) {
                this.fileInput.click();
            }
        },

        /**
         * Save file
         */
        saveFile(): void {
            if (!this.editor) return;

            const content = this.editor.value;
            const blob = new Blob([content], {
                type: 'text/plain;charset=utf-8',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const firstLine = content.split('\n')[0] || 'text';
            const sanitized =
                firstLine
                    .trim()
                    .substring(0, 20)
                    .replace(/[^a-zA-Z0-9-_]/g, '') || 'text';
            a.download = `${sanitized}.txt`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        /**
         * Execute document command
         * @param {string} command - Command to execute
         */
        execCommand(command: string): void {
            this.focusEditor();
            try {
                if (!document.execCommand(command)) {
                    this.setStatusPlain(`Command ${command} not available`);
                }
            } catch (err) {
                console.warn(`Command ${command} failed:`, err);
                this.setStatusPlain(`Command ${command} failed`);
            }
        },

        /**
         * Handle paste operation
         */
        handlePaste(): void {
            this.focusEditor();

            if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
                navigator.clipboard
                    .readText()
                    .then(text => {
                        if (text && this.editor) {
                            this.insertTextAtCursor(text);
                        }
                    })
                    .catch(() => {
                        this.execCommand('paste');
                    });
            } else {
                this.execCommand('paste');
            }
        },

        /**
         * Select all text
         */
        selectAll(): void {
            this.focusEditor();
            if (this.editor) {
                this.editor.select();
            }
        },

        /**
         * Insert text at cursor position
         * @param {string} text - Text to insert
         */
        insertTextAtCursor(text: string): void {
            if (!this.editor || typeof text !== 'string') return;

            const start =
                typeof this.editor.selectionStart === 'number'
                    ? this.editor.selectionStart
                    : this.editor.value.length;
            const end =
                typeof this.editor.selectionEnd === 'number' ? this.editor.selectionEnd : start;

            this.editor.setRangeText(text, start, end, 'end');
            this.editor.dispatchEvent(new Event('input', { bubbles: true }));
        },

        /**
         * Update document title
         */
        updateDocumentTitle(): void {
            const titleKey =
                this.currentRemoteFile && this.currentRemoteFile.fileName
                    ? 'textEditor.documentTitleWithFile'
                    : 'textEditor.documentTitle';

            const params =
                this.currentRemoteFile && this.currentRemoteFile.fileName
                    ? { fileName: this.currentRemoteFile.fileName }
                    : undefined;

            const { text } = this.resolveTranslation(titleKey, params);
            document.title = text;
        },

        /**
         * Format file label for display
         * @param {Object} meta - File metadata
         * @returns {string} Formatted label
         */
        formatFileLabel(meta: FileMeta = {}): string {
            const parts = [];
            if (meta.repo) parts.push(meta.repo);
            if (meta.path) {
                parts.push(meta.path);
            } else if (meta.fileName) {
                parts.push(meta.fileName);
            }
            return parts.join(' / ');
        },

        /**
         * Set plain text status
         * @param {string} text - Status text
         */
        setStatusPlain(text: string | null | undefined): void {
            if (!text) {
                this.clearStatus();
                return;
            }
            this.statusState = { type: 'plain', text };
            this.applyStatusState();
        },

        /**
         * Set localized status
         * @param {string} key - Translation key
         * @param {Object} params - Translation parameters
         */
        setStatusLocalized(key: string, params?: Record<string, unknown>): void {
            this.statusState = {
                type: 'i18n',
                key,
                params: params || undefined,
            };
            this.applyStatusState();
        },

        /**
         * Clear status
         */
        clearStatus(): void {
            this.statusState = null;
            this.applyStatusState();
        },

        /**
         * Apply status state to UI
         */
        applyStatusState(): void {
            if (!this.statusBar) return;

            if (!this.statusState) {
                this.statusBar.textContent = '';
                this.statusBar.style.display = 'none';
                this.statusBar.removeAttribute('data-i18n');
                this.statusBar.removeAttribute('data-i18n-params');
                return;
            }

            if (this.statusState.type === 'i18n') {
                const { text, translated } = this.resolveTranslation(
                    this.statusState.key,
                    this.statusState.params
                );
                this.statusBar.textContent = text;

                if (translated) {
                    this.statusBar.setAttribute('data-i18n', this.statusState.key);
                    if (this.statusState.params) {
                        this.statusBar.setAttribute(
                            'data-i18n-params',
                            JSON.stringify(this.statusState.params)
                        );
                    } else {
                        this.statusBar.removeAttribute('data-i18n-params');
                    }

                    if (window.appI18n && typeof window.appI18n.applyTranslations === 'function') {
                        window.appI18n.applyTranslations(this.statusBar);
                    }
                } else {
                    this.statusBar.removeAttribute('data-i18n');
                    this.statusBar.removeAttribute('data-i18n-params');
                }
            } else {
                this.statusBar.removeAttribute('data-i18n');
                this.statusBar.removeAttribute('data-i18n-params');
                this.statusBar.textContent = this.statusState.text;
            }

            this.statusBar.style.display = 'block';
        },

        /**
         * Resolve translation
         * @param {string} key - Translation key
         * @param {Object} params - Translation parameters
         * @returns {Object} Resolved translation
         */
        resolveTranslation(
            key: string,
            params?: Record<string, unknown>
        ): { text: string; translated: boolean } {
            if (!key) return { text: '', translated: false };

            const fallbackMessages = {
                'textEditor.documentTitle': () => 'Texteditor',
                'textEditor.documentTitleWithFile': p => {
                    const fileName = p && p.fileName ? p.fileName : '';
                    return fileName ? `Texteditor – ${fileName}` : 'Texteditor';
                },
                'textEditor.status.loading': () => 'Lade Datei …',
                'textEditor.status.loadingWithLabel': p => {
                    const label = p && p.label ? p.label : '';
                    return label ? `${label} (lädt …)` : 'Lade Datei …';
                },
                'textEditor.status.loadError': () => 'Datei konnte nicht geladen werden.',
                'textEditor.status.rateLimit': () =>
                    'GitHub Rate Limit erreicht. Bitte versuche es später erneut.',
                'textEditor.status.wordCount': p => {
                    const words = p && typeof p.words === 'number' ? p.words : 0;
                    const chars = p && typeof p.chars === 'number' ? p.chars : 0;
                    return `Words: ${words} | Characters: ${chars}`;
                },
                'textEditor.status.position': p => {
                    const line = p && typeof p.line === 'number' ? p.line : 1;
                    const col = p && typeof p.col === 'number' ? p.col : 1;
                    return `Line ${line}, Col ${col}`;
                },
                'textEditor.findReplace.noMatch': () => 'No match found',
                'textEditor.findReplace.replacedCount': p => {
                    const count = p && typeof p.count === 'number' ? p.count : 0;
                    return `Replaced ${count} occurrence(s)`;
                },
            };

            try {
                if (window.appI18n && typeof window.appI18n.translate === 'function') {
                    const translated = window.appI18n.translate(key, params);
                    if (translated && translated !== key) {
                        return { text: translated, translated: true };
                    }
                }
            } catch (err) {
                console.warn('Translation failed, falling back:', err);
            }

            const fallbackFn = fallbackMessages[key];
            if (typeof fallbackFn === 'function') {
                return { text: fallbackFn(params || {}), translated: false };
            }

            return { text: key, translated: false };
        },

        // ==================== Public API for Finder Integration ====================

        /**
         * Load remote file into editor
         * @param {Object} payload - File payload
         * @param {string} payload.content - File content
         * @param {string} [payload.fileName] - File name
         * @param {string} [payload.repo] - Repository name
         * @param {string} [payload.path] - File path
         */
        loadRemoteFile(payload: Partial<RemoteFilePayload>): void {
            if (typeof payload.content !== 'string') {
                console.warn('Invalid payload for loadRemoteFile:', payload);
                return;
            }

            const remotePayload: RemoteFilePayload = {
                content: payload.content,
                fileName: payload.fileName,
                repo: payload.repo,
                path: payload.path,
            };

            if (this.editor) {
                this.editor.value = remotePayload.content;
                this.updateWordCount();
                this.updateCursorPosition();
            }

            this.currentRemoteFile = remotePayload;
            const label = this.formatFileLabel(remotePayload);
            this.updateDocumentTitle();
            this.setStatusPlain(label);

            try {
                localStorage.setItem('textEditorContent', remotePayload.content);
            } catch (err) {
                console.warn('Could not save to localStorage:', err);
            }

            this.syncSaveButtonState();
            this.focusEditor();
        },

        /**
         * Show loading state
         * @param {Object} payload - Loading payload
         * @param {string} [payload.fileName] - File name
         * @param {string} [payload.repo] - Repository name
         * @param {string} [payload.path] - File path
         */
        showLoading(payload: FileMeta = {}): void {
            const label = this.formatFileLabel(payload);
            if (label) {
                this.setStatusLocalized('textEditor.status.loadingWithLabel', {
                    label,
                });
            } else {
                this.setStatusLocalized('textEditor.status.loading');
            }
        },

        /**
         * Show load error
         * @param {Object} payload - Error payload
         * @param {string} [payload.message] - Error message
         * @param {string} [payload.fileName] - File name
         * @param {string} [payload.repo] - Repository name
         * @param {string} [payload.path] - File path
         */
        showLoadError(payload: LoadErrorPayload = {}): void {
            const label = this.formatFileLabel(payload);
            const fallback = this.resolveTranslation('textEditor.status.loadError');
            const message = payload && payload.message ? payload.message : fallback.text;

            if (label) {
                this.setStatusPlain(`${label} — ${message}`);
            } else {
                this.setStatusPlain(message);
            }
        },

        /**
         * Handle menu action
         * @param {string} action - Action name
         */
        handleMenuAction(action: string): void {
            if (!action) return;

            const actionMap = {
                'file:new': 'textEditor:clear',
                'file:open': 'textEditor:open',
                'file:save': 'textEditor:save',
                'edit:undo': 'textEditor:undo',
                'edit:redo': 'textEditor:redo',
                'edit:cut': 'textEditor:cut',
                'edit:copy': 'textEditor:copy',
                'edit:paste': 'textEditor:paste',
                'edit:selectAll': 'textEditor:selectAll',
                'view:toggleWrap': 'textEditor:toggleWrap',
            };

            const mappedAction = actionMap[action];
            if (mappedAction && window.ActionBus) {
                window.ActionBus.execute(mappedAction);
            } else {
                console.warn('Unknown menu action:', action);
            }
        },

        // ==================== New Formatting Methods ====================

        /**
         * Wrap selected text with prefix and suffix
         * @param {string} prefix - Text to insert before selection
         * @param {string} suffix - Text to insert after selection
         */
        wrapSelection(prefix: string, suffix: string): void {
            if (!this.editor) return;

            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            const selectedText = this.editor.value.substring(start, end);
            const wrappedText = prefix + selectedText + suffix;

            this.editor.setRangeText(wrappedText, start, end, 'select');
            this.editor.dispatchEvent(new Event('input', { bubbles: true }));
            this.focusEditor();
        },

        /**
         * Insert heading at current line
         * @param {number} level - Heading level (1-3)
         */
        insertHeading(level: number): void {
            if (!this.editor) return;

            const start = this.editor.selectionStart;
            const text = this.editor.value;

            // Find the start of the current line
            const lineStart = text.lastIndexOf('\n', start - 1) + 1;
            let lineEnd = text.indexOf('\n', start);
            if (lineEnd === -1) lineEnd = text.length;

            const currentLine = text.substring(lineStart, lineEnd);
            const prefix = '#'.repeat(level) + ' ';

            // Check if line already starts with heading markers
            const headingMatch = currentLine.match(/^#+\s/);
            let newLine;

            if (headingMatch) {
                // Replace existing heading
                newLine = prefix + currentLine.substring(headingMatch[0].length);
            } else {
                // Add new heading
                newLine = prefix + currentLine;
            }

            this.editor.setRangeText(newLine, lineStart, lineEnd, 'end');
            this.editor.dispatchEvent(new Event('input', { bubbles: true }));
            this.focusEditor();
        },

        /**
         * Insert list at current line or for selected lines
         * @param {string} type - List type ('ordered' or 'unordered')
         */
        insertList(type: 'ordered' | 'unordered'): void {
            if (!this.editor) return;

            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            const text = this.editor.value;

            // Find the start and end of affected lines
            const lineStart = text.lastIndexOf('\n', start - 1) + 1;
            let lineEnd = text.indexOf('\n', end);
            if (lineEnd === -1) lineEnd = text.length;

            const selectedLines = text.substring(lineStart, lineEnd).split('\n');
            const prefix = type === 'ordered' ? null : '- ';

            const newLines = selectedLines.map((line, index) => {
                // Remove existing list markers
                const cleanLine = line.replace(/^(?:\d+\.\s|-\s|\*\s)/, '');

                if (type === 'ordered') {
                    return `${index + 1}. ${cleanLine}`;
                }
                // use prefix for unordered lists
                return `${prefix}${cleanLine}`;
            });

            const newText = newLines.join('\n');
            this.editor.setRangeText(newText, lineStart, lineEnd, 'end');
            this.editor.dispatchEvent(new Event('input', { bubbles: true }));
            this.focusEditor();
        },

        /**
         * Align text (add HTML alignment tags)
         * @param {string} alignment - Alignment type ('left', 'center', 'right')
         */
        alignText(alignment: 'left' | 'center' | 'right'): void {
            if (!this.editor) return;

            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            const text = this.editor.value;

            // Find the start and end of affected lines
            const lineStart = text.lastIndexOf('\n', start - 1) + 1;
            let lineEnd = text.indexOf('\n', end);
            if (lineEnd === -1) lineEnd = text.length;

            const selectedText = text.substring(lineStart, lineEnd);
            const alignedText = `<div style="text-align: ${alignment};">\n${selectedText}\n</div>`;

            this.editor.setRangeText(alignedText, lineStart, lineEnd, 'end');
            this.editor.dispatchEvent(new Event('input', { bubbles: true }));
            this.focusEditor();
        },

        /**
         * Insert link at cursor or wrap selection
         */
        insertLink(): void {
            if (!this.editor) return;

            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            const selectedText = this.editor.value.substring(start, end);

            const urlLabel =
                this.resolveTranslation('textEditor.insertLink.enterUrl').text || 'Enter URL:';
            this.showInputModal(urlLabel, 'https://example.com', 'https://').then(url => {
                if (!url) return;

                const linkText = selectedText || 'link text';
                const markdown = `[${linkText}](${url})`;

                this.editor.setRangeText(markdown, start, end, 'end');
                this.editor.dispatchEvent(new Event('input', { bubbles: true }));
                this.focusEditor();
            });
        },

        /**
         * Update word and character count
         */
        updateWordCount(): void {
            if (!this.editor || !this.wordCountDisplay) return;

            const text = this.editor.value;
            const chars = text.length;
            const trimmedText = text.trim();
            const words = trimmedText === '' ? 0 : trimmedText.split(/\s+/).length;

            // Use i18n if available
            if (window.appI18n && typeof window.appI18n.translate === 'function') {
                const translated = window.appI18n.translate('textEditor.status.wordCount', {
                    words,
                    chars,
                });
                if (translated && translated !== 'textEditor.status.wordCount') {
                    this.wordCountDisplay.textContent = translated;
                    return;
                }
            }

            // Fallback to English
            this.wordCountDisplay.textContent = `Words: ${words} | Characters: ${chars}`;
        },

        /**
         * Update cursor position display
         */
        updateCursorPosition(): void {
            if (!this.editor || !this.lineColDisplay) return;

            const text = this.editor.value;
            const pos = this.editor.selectionStart;

            const textBeforeCursor = text.substring(0, pos);
            const lines = textBeforeCursor.split('\n');
            const line = lines.length;
            const col = lines[lines.length - 1].length + 1;

            // Use i18n if available
            if (window.appI18n && typeof window.appI18n.translate === 'function') {
                const translated = window.appI18n.translate('textEditor.status.position', {
                    line,
                    col,
                });
                if (translated && translated !== 'textEditor.status.position') {
                    this.lineColDisplay.textContent = translated;
                    return;
                }
            }

            // Fallback to English
            this.lineColDisplay.textContent = `Line ${line}, Col ${col}`;
        },

        /**
         * Toggle find and replace panel
         */
        toggleFindReplace(): void {
            if (!this.findReplacePanel) return;

            if (this.findReplacePanel.style.display === 'none') {
                this.findReplacePanel.style.display = 'flex';
                if (this.findInput) {
                    this.findInput.focus();
                }
            } else {
                this.findReplacePanel.style.display = 'none';
                this.focusEditor();
            }
        },

        /**
         * Close find and replace panel
         */
        closeFindReplace(): void {
            if (!this.findReplacePanel) return;
            this.findReplacePanel.style.display = 'none';
            this.focusEditor();
        },

        /**
         * Find next occurrence
         */
        findNext(): void {
            if (!this.editor || !this.findInput) return;

            const searchText = this.findInput.value;
            if (!searchText) return;

            const text = this.editor.value;
            const start = this.editor.selectionEnd;
            const index = text.indexOf(searchText, start);

            if (index !== -1) {
                this.editor.setSelectionRange(index, index + searchText.length);
                this.editor.focus();
            } else {
                // Wrap around to beginning
                const firstIndex = text.indexOf(searchText);
                if (firstIndex !== -1) {
                    this.editor.setSelectionRange(firstIndex, firstIndex + searchText.length);
                    this.editor.focus();
                } else {
                    const message =
                        this.resolveTranslation('textEditor.findReplace.noMatch').text ||
                        'No match found';
                    this.showToast(message, 'info');
                }
            }
        },

        /**
         * Replace one occurrence
         */
        replaceOne(): void {
            if (!this.editor || !this.findInput || !this.replaceInput) return;

            const searchText = this.findInput.value;
            const replaceText = this.replaceInput.value;

            if (!searchText) return;

            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            const selectedText = this.editor.value.substring(start, end);

            if (selectedText === searchText) {
                this.editor.setRangeText(replaceText, start, end, 'end');
                this.editor.dispatchEvent(new Event('input', { bubbles: true }));
                this.findNext(); // Find next occurrence
            } else {
                this.findNext(); // Find first occurrence
            }
        },

        /**
         * Replace all occurrences
         */
        replaceAll(): void {
            if (!this.editor || !this.findInput || !this.replaceInput) return;

            const searchText = this.findInput.value;
            const replaceText = this.replaceInput.value;

            if (!searchText) return;

            const text = this.editor.value;
            const parts = text.split(searchText);
            const count = parts.length - 1;

            if (count > 0) {
                const newText = parts.join(replaceText);
                this.editor.value = newText;
                this.editor.dispatchEvent(new Event('input', { bubbles: true }));

                const message =
                    this.resolveTranslation('textEditor.findReplace.replacedCount', { count })
                        .text || `Replaced ${count} occurrence(s)`;
                this.showToast(message, 'success');
            } else {
                const message =
                    this.resolveTranslation('textEditor.findReplace.noMatch').text ||
                    'No match found';
                this.showToast(message, 'info');
            }

            this.focusEditor();
        },

        /**
         * Show toast notification
         * @param {string} message - Message to display
         * @param {string} type - Toast type: 'info', 'success', 'error'
         * @param {number} duration - Display duration in ms (default: 3000)
         */
        showToast(
            message: string,
            type: 'info' | 'success' | 'error' = 'info',
            duration = 3000
        ): void {
            if (!this.container) return;

            const toast = document.createElement('div');
            toast.className = `text-editor-toast text-editor-toast-${type}`;
            toast.textContent = message;

            // Add to container
            if (!this.toastContainer) {
                this.toastContainer = document.createElement('div');
                this.toastContainer.className = 'text-editor-toast-container';
                this.container.appendChild(this.toastContainer);
            }

            this.toastContainer.appendChild(toast);

            // Trigger animation
            setTimeout(() => toast.classList.add('show'), 10);

            // Auto-remove
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        },

        /**
         * Show input modal dialog
         * @param {string} title - Modal title
         * @param {string} placeholder - Input placeholder
         * @param {string} defaultValue - Default input value
         * @returns {Promise<string|null>} Resolves with input value or null if cancelled
         */
        showInputModal(
            title: string,
            placeholder = '',
            defaultValue = ''
        ): string | null {
            return new Promise(resolve => {
                const modal = document.createElement('div');
                modal.className = 'text-editor-modal-overlay';

                modal.innerHTML = `
                    <div class="text-editor-modal">
                        <div class="text-editor-modal-header">
                            <h3>${title}</h3>
                        </div>
                        <div class="text-editor-modal-body">
                            <input type="text" class="text-editor-modal-input" placeholder="${placeholder}" value="${defaultValue}">
                        </div>
                        <div class="text-editor-modal-footer">
                            <button class="text-editor-modal-btn text-editor-modal-btn-cancel">Cancel</button>
                            <button class="text-editor-modal-btn text-editor-modal-btn-confirm">OK</button>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);

                const input = modal.querySelector('.text-editor-modal-input');
                const cancelBtn = modal.querySelector('.text-editor-modal-btn-cancel');
                const confirmBtn = modal.querySelector('.text-editor-modal-btn-confirm');

                // Focus input and select text
                setTimeout(() => {
                    input.focus();
                    input.select();
                }, 50);

                const cleanup = () => {
                    modal.classList.add('closing');
                    setTimeout(() => modal.remove(), 200);
                };

                const handleConfirm = () => {
                    const value = input.value.trim();
                    cleanup();
                    resolve(value || null);
                };

                const handleCancel = () => {
                    cleanup();
                    resolve(null);
                };

                // Event listeners
                confirmBtn.addEventListener('click', handleConfirm);
                cancelBtn.addEventListener('click', handleCancel);
                input.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirm();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        handleCancel();
                    }
                });

                // Click outside to close
                modal.addEventListener('click', e => {
                    if (e.target === modal) {
                        handleCancel();
                    }
                });

                // Trigger animation
                setTimeout(() => modal.classList.add('show'), 10);
            });
        },

        /**
         * Destroy text editor
         */
        destroy(): void {
            if (this.container) {
                this.container.innerHTML = '';
                this.container = null;
            }
            this.editor = null;
            this.statusBar = null;
            this.saveButton = null;
            this.fileInput = null;
            this.wordCountDisplay = null;
            this.lineColDisplay = null;
            this.findReplacePanel = null;
            this.findInput = null;
            this.replaceInput = null;
            this.toastContainer = null;
        },
    };

    // Export to global scope
    window.TextEditorSystem = TextEditorSystem;

    // Auto-init if container exists on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const container = document.getElementById('text-editor-container');
            if (container) {
                TextEditorSystem.init(container);
            }
        });
    } else {
        const container = document.getElementById('text-editor-container');
        if (container) {
            TextEditorSystem.init(container);
        }
    }
})();
