/**
 * Text Editor Module
 * Replaces text.html iframe with inline text editor
 */

(function () {
    'use strict';

    const TextEditorSystem = {
        container: null,
        editor: null,
        statusBar: null,
        saveButton: null,
        fileInput: null,
        wrapMode: 'off',
        currentRemoteFile: null,
        statusState: null,

        /**
         * Initialize text editor in container
         * @param {HTMLElement|string} containerOrId - Container element or ID
         */
        init(containerOrId) {
            const container = typeof containerOrId === 'string'
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
        render() {
            if (!this.container) return;

            this.container.innerHTML = `
                <div class="dialog-content flex flex-col h-full" style="background: var(--editor-body-bg, #fafafa); color: var(--editor-text, #111827);">
                    <div id="text-toolbar" class="flex-none" style="background: var(--editor-toolbar-bg, #f5f5f5); padding: 8px 12px; border-bottom: 1px solid var(--editor-toolbar-border, #d1d5db); display: flex; gap: 8px; align-items: center;">
                        <button type="button" data-action="textEditor:clear" class="text-editor-btn" data-i18n="textEditor.toolbar.clear" data-i18n-title="textEditor.toolbar.clear">Neu</button>
                        <button type="button" data-action="textEditor:open" class="text-editor-btn" data-i18n="textEditor.toolbar.open" data-i18n-title="textEditor.toolbar.open">Öffnen</button>
                        <button type="button" data-action="textEditor:save" class="text-editor-btn" id="text-save-button" data-i18n="textEditor.toolbar.save" data-i18n-title="textEditor.toolbar.save">Speichern</button>
                        <input type="file" id="text-file-input"
                            accept=".txt,.md,.markdown,.html,.htm,.css,.scss,.js,.jsx,.ts,.tsx,.json,.yml,.yaml,.xml,.csv,.tsv,.ini,.cfg,.conf,.env,.gitignore,.log,.c,.h,.cpp,.hpp,.java,.kt,.swift,.cs,.py,.rb,.php,.rs,.go,.sh,.bash,.zsh,.fish,.ps1,.bat"
                            style="display:none">
                    </div>
                    <div id="text-file-status" class="flex-none" style="padding: 8px 16px; border-bottom: 1px solid var(--editor-toolbar-border, #d1d5db); background: var(--editor-body-bg, #fafafa); color: var(--editor-text, #111827); font-size: 14px; opacity: 0.75; display: none;"></div>
                    <textarea id="text-editor-textarea" spellcheck="false" wrap="off" class="flex-1 w-full resize-none p-4 border-0 outline-none" 
                        style="background: var(--editor-surface-bg, #ffffff); color: inherit; font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 14px; line-height: 1.6; tab-size: 4;"
                        title="textarea"></textarea>
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
        updateCSSVariables() {
            if (!this.container) return;

            const isDark = document.documentElement.classList.contains('dark');
            
            this.container.style.setProperty('--editor-body-bg', isDark ? '#0f172a' : '#fafafa');
            this.container.style.setProperty('--editor-text', isDark ? '#e5e7eb' : '#111827');
            this.container.style.setProperty('--editor-toolbar-bg', isDark ? '#1f2937' : '#f5f5f5');
            this.container.style.setProperty('--editor-toolbar-border', isDark ? '#374151' : '#d1d5db');
            this.container.style.setProperty('--editor-toolbar-button-bg', isDark ? '#111827' : '#ffffff');
            this.container.style.setProperty('--editor-toolbar-button-hover', isDark ? '#1f2937' : '#e5e7eb');
            this.container.style.setProperty('--editor-toolbar-button-border', isDark ? '#475569' : '#d1d5db');
            this.container.style.setProperty('--editor-surface-bg', isDark ? '#111827' : '#ffffff');

            // Apply button styles
            const buttons = this.container.querySelectorAll('.text-editor-btn');
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
        cacheElements() {
            if (!this.container) return;

            this.editor = this.container.querySelector('#text-editor-textarea');
            this.statusBar = this.container.querySelector('#text-file-status');
            this.saveButton = this.container.querySelector('#text-save-button');
            this.fileInput = this.container.querySelector('#text-file-input');
        },

        /**
         * Load wrap mode preference
         */
        loadWrapPreference() {
            const storedWrapMode = localStorage.getItem('textEditorWrapMode');
            this.wrapMode = storedWrapMode === 'soft' ? 'soft' : 'off';
            this.applyWrapMode(this.wrapMode);
        },

        /**
         * Apply wrap mode
         * @param {string} mode - Wrap mode (soft|off)
         */
        applyWrapMode(mode) {
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
        toggleWrapMode() {
            const next = this.wrapMode === 'soft' ? 'off' : 'soft';
            this.applyWrapMode(next);
            this.setStatusPlain(next === 'soft' ? 'Zeilenumbruch aktiviert' : 'Zeilenumbruch deaktiviert');
            this.focusEditor();
        },

        /**
         * Attach event listeners
         */
        attachListeners() {
            if (!this.editor || !this.fileInput) return;

            // Editor input listener for auto-save
            this.editor.addEventListener('input', () => {
                this.handleEditorInput();
            });

            // File input change listener
            this.fileInput.addEventListener('change', (event) => {
                this.handleFileSelect(event);
            });

            // Listen for theme changes to update CSS variables
            const themeObserver = new MutationObserver(() => {
                this.updateCSSVariables();
            });
            themeObserver.observe(document.documentElement, { 
                attributes: true, 
                attributeFilter: ['class'] 
            });

            // Listen for language changes
            window.addEventListener('languagePreferenceChange', () => {
                this.updateDocumentTitle();
                this.applyStatusState();
            });
        },

        /**
         * Register actions with ActionBus
         */
        registerActions() {
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
                'textEditor:selectAll': () => this.selectAll()
            });
        },

        /**
         * Handle editor input
         */
        handleEditorInput() {
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
        handleFileSelect(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                if (this.editor) {
                    this.editor.value = content;
                }
                this.currentRemoteFile = { fileName: file.name };
                this.updateDocumentTitle();
                this.setStatusPlain(file.name);
                this.syncSaveButtonState();
                this.focusEditor();
            };
            reader.readAsText(file);

            // Reset input for future opens
            event.target.value = '';
        },

        /**
         * Load saved content from localStorage
         */
        loadSavedContent() {
            if (!this.editor) return;

            try {
                const saved = localStorage.getItem('textEditorContent');
                if (saved) {
                    this.editor.value = saved;
                }
            } catch (err) {
                console.warn('Could not load saved content:', err);
            }
        },

        /**
         * Sync save button state
         */
        syncSaveButtonState() {
            if (!this.saveButton || !this.editor) return;

            this.saveButton.disabled = this.editor.value.length === 0;
        },

        /**
         * Focus editor
         */
        focusEditor() {
            if (this.editor) {
                this.editor.focus();
            }
        },

        /**
         * Clear editor
         */
        clearEditor() {
            if (!this.editor) return;

            this.editor.value = '';
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
        openFile() {
            if (this.fileInput) {
                this.fileInput.click();
            }
        },

        /**
         * Save file
         */
        saveFile() {
            if (!this.editor) return;

            const content = this.editor.value;
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const firstLine = content.split('\n')[0] || 'text';
            const sanitized = firstLine.trim().substring(0, 20).replace(/[^a-zA-Z0-9-_]/g, '') || 'text';
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
        execCommand(command) {
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
        handlePaste() {
            this.focusEditor();

            if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
                navigator.clipboard.readText()
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
        selectAll() {
            this.focusEditor();
            if (this.editor) {
                this.editor.select();
            }
        },

        /**
         * Insert text at cursor position
         * @param {string} text - Text to insert
         */
        insertTextAtCursor(text) {
            if (!this.editor || typeof text !== 'string') return;

            const start = typeof this.editor.selectionStart === 'number' 
                ? this.editor.selectionStart 
                : this.editor.value.length;
            const end = typeof this.editor.selectionEnd === 'number' 
                ? this.editor.selectionEnd 
                : start;

            this.editor.setRangeText(text, start, end, 'end');
            this.editor.dispatchEvent(new Event('input', { bubbles: true }));
        },

        /**
         * Update document title
         */
        updateDocumentTitle() {
            const titleKey = this.currentRemoteFile && this.currentRemoteFile.fileName
                ? 'textEditor.documentTitleWithFile'
                : 'textEditor.documentTitle';

            const params = this.currentRemoteFile && this.currentRemoteFile.fileName
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
        formatFileLabel(meta = {}) {
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
        setStatusPlain(text) {
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
        setStatusLocalized(key, params) {
            this.statusState = { type: 'i18n', key, params: params || undefined };
            this.applyStatusState();
        },

        /**
         * Clear status
         */
        clearStatus() {
            this.statusState = null;
            this.applyStatusState();
        },

        /**
         * Apply status state to UI
         */
        applyStatusState() {
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
                        this.statusBar.setAttribute('data-i18n-params', JSON.stringify(this.statusState.params));
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
        resolveTranslation(key, params) {
            if (!key) return { text: '', translated: false };

            const fallbackMessages = {
                'textEditor.documentTitle': () => 'Texteditor',
                'textEditor.documentTitleWithFile': (p) => {
                    const fileName = p && p.fileName ? p.fileName : '';
                    return fileName ? `Texteditor – ${fileName}` : 'Texteditor';
                },
                'textEditor.status.loading': () => 'Lade Datei …',
                'textEditor.status.loadingWithLabel': (p) => {
                    const label = p && p.label ? p.label : '';
                    return label ? `${label} (lädt …)` : 'Lade Datei …';
                },
                'textEditor.status.loadError': () => 'Datei konnte nicht geladen werden.',
                'textEditor.status.rateLimit': () => 'GitHub Rate Limit erreicht. Bitte versuche es später erneut.'
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
        loadRemoteFile(payload = {}) {
            if (typeof payload.content !== 'string') {
                console.warn('Invalid payload for loadRemoteFile:', payload);
                return;
            }

            if (this.editor) {
                this.editor.value = payload.content;
            }

            this.currentRemoteFile = payload;
            const label = this.formatFileLabel(payload);
            this.updateDocumentTitle();
            this.setStatusPlain(label);

            try {
                localStorage.setItem('textEditorContent', payload.content);
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
        showLoading(payload = {}) {
            const label = this.formatFileLabel(payload);
            if (label) {
                this.setStatusLocalized('textEditor.status.loadingWithLabel', { label });
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
        showLoadError(payload = {}) {
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
        handleMenuAction(action) {
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
                'view:toggleWrap': 'textEditor:toggleWrap'
            };

            const mappedAction = actionMap[action];
            if (mappedAction && window.ActionBus) {
                window.ActionBus.execute(mappedAction);
            } else {
                console.warn('Unknown menu action:', action);
            }
        },

        /**
         * Destroy text editor
         */
        destroy() {
            if (this.container) {
                this.container.innerHTML = '';
                this.container = null;
            }
            this.editor = null;
            this.statusBar = null;
            this.saveButton = null;
            this.fileInput = null;
        }
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
