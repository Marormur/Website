'use strict';
console.log('TextEditorInstance (TS) loaded');
/**
 * TextEditorInstance - Multi-Instance capable text editor
 * TypeScript migration preserving global API and behavior.
 */
(() => {
    'use strict';
    const Base = window.BaseWindowInstance;
    class TextEditorInstance extends Base {
        constructor(config) {
            super({
                ...config,
                type: 'text-editor',
            });
            this.editor = null;
            this.statusBar = null;
            this.saveButton = null;
            this.fileInput = null;
            this.wordCountDisplay = null;
            this.lineColDisplay = null;
            this.findReplacePanel = null;
            this.findInput = null;
            this.replaceInput = null;
            this.wrapMode = 'off';
            this.currentRemoteFile = null;
            this.currentFilename = config.filename || 'Untitled.txt';
            this.isDirty = false;
        }
        render() {
            if (!this.container)
                return;
            const isDark = document.documentElement.classList.contains('dark');
            this.container.innerHTML = `
                <div class="text-editor-wrapper flex flex-col h-full" style="background: ${isDark ? '#0f172a' : '#fafafa'}; color: ${isDark ? '#e5e7eb' : '#111827'};">
                    <!-- Toolbar -->
                    <div class="text-editor-toolbar flex-none" style="background: ${isDark ? '#1f2937' : '#f5f5f5'}; padding: 8px 12px; border-bottom: 1px solid ${isDark ? '#374151' : '#d1d5db'}; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <button type="button" class="text-editor-btn" data-action="clear" title="Neu">Neu</button>
                        <button type="button" class="text-editor-btn" data-action="open" title="Öffnen">Öffnen</button>
                        <button type="button" class="text-editor-btn text-save-btn" data-action="save" title="Speichern">Speichern</button>
                        <div class="toolbar-separator"></div>
                        <button type="button" class="text-editor-btn" data-action="bold" title="Fett" style="font-weight: bold;">B</button>
                        <button type="button" class="text-editor-btn" data-action="italic" title="Kursiv" style="font-style: italic;">I</button>
                        <button type="button" class="text-editor-btn" data-action="underline" title="Unterstrichen" style="text-decoration: underline;">U</button>
                        <div class="toolbar-separator"></div>
                        <button type="button" class="text-editor-btn" data-action="find" title="Suchen & Ersetzen">🔍</button>
                        <button type="button" class="text-editor-btn" data-action="toggleWrap" title="Zeilenumbruch">⏎</button>
                        <input type="file" class="text-file-input"
                            accept=".txt,.md,.markdown,.html,.css,.js,.json,.yml,.yaml,.xml"
                            style="display:none">
                    </div>

                    <!-- Find/Replace Panel (hidden by default) -->
                    <div class="find-replace-panel" style="background: ${isDark ? '#1f2937' : '#f5f5f5'}; padding: 8px 12px; border-bottom: 1px solid ${isDark ? '#374151' : '#d1d5db'}; display: none; gap: 8px; align-items: center;">
                        <input type="text" class="find-input" placeholder="Suchen..." style="padding: 4px 8px; border: 1px solid ${isDark ? '#475569' : '#d1d5db'}; border-radius: 4px; background: ${isDark ? '#111827' : '#ffffff'}; color: inherit;">
                        <input type="text" class="replace-input" placeholder="Ersetzen..." style="padding: 4px 8px; border: 1px solid ${isDark ? '#475569' : '#d1d5db'}; border-radius: 4px; background: ${isDark ? '#111827' : '#ffffff'}; color: inherit;">
                        <button type="button" class="text-editor-btn" data-action="findNext">Weiter</button>
                        <button type="button" class="text-editor-btn" data-action="replaceOne">Ersetzen</button>
                        <button type="button" class="text-editor-btn" data-action="replaceAll">Alle ersetzen</button>
                        <button type="button" class="text-editor-btn" data-action="closeFindReplace">✕</button>
                    </div>

                    <!-- Status Bar for filename -->
                    <div class="text-file-status" style="padding: 6px 12px; border-bottom: 1px solid ${isDark ? '#374151' : '#d1d5db'}; background: ${isDark ? '#1f2937' : '#f5f5f5'}; font-size: 13px; opacity: 0.85; display: none;"></div>

                    <!-- Editor Textarea -->
                    <textarea class="text-editor-textarea flex-1 w-full resize-none p-4 border-0 outline-none"
                        spellcheck="false"
                        wrap="off"
                        style="background: ${isDark ? '#111827' : '#ffffff'}; color: inherit; font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Courier New', monospace; font-size: 14px; line-height: 1.6; tab-size: 4;"
                        placeholder="Text eingeben..."></textarea>

                    <!-- Status Bar -->
                    <div class="text-editor-statusbar flex-none" style="background: ${isDark ? '#1f2937' : '#f5f5f5'}; padding: 6px 12px; border-top: 1px solid ${isDark ? '#374151' : '#d1d5db'}; font-size: 12px; opacity: 0.75; display: flex; justify-content: space-between;">
                        <span class="word-count-display">Wörter: 0 | Zeichen: 0</span>
                        <span class="line-col-display">Zeile 1, Spalte 1</span>
                    </div>
                </div>
            `;
            this._applyButtonStyles();
        }
        _applyButtonStyles() {
            if (!this.container)
                return;
            const isDark = document.documentElement.classList.contains('dark');
            const buttons = this.container.querySelectorAll('.text-editor-btn');
            buttons.forEach((btn) => {
                btn.style.cssText = `
                    padding: 6px 12px;
                    font-size: 13px;
                    border: 1px solid ${isDark ? '#475569' : '#d1d5db'};
                    background: ${isDark ? '#111827' : '#ffffff'};
                    color: inherit;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: background 0.2s;
                `;
            });
            const separators = this.container.querySelectorAll('.toolbar-separator');
            separators.forEach((sep) => {
                sep.style.cssText = `
                    width: 1px;
                    height: 20px;
                    background: ${isDark ? '#475569' : '#d1d5db'};
                    margin: 0 4px;
                `;
            });
        }
        attachEventListeners() {
            if (!this.container)
                return;
            this.editor = this.container.querySelector('.text-editor-textarea');
            this.statusBar = this.container.querySelector('.text-file-status');
            this.saveButton = this.container.querySelector('[data-action="save"]');
            this.fileInput = this.container.querySelector('.text-file-input');
            this.wordCountDisplay = this.container.querySelector('.word-count-display');
            this.lineColDisplay = this.container.querySelector('.line-col-display');
            this.findReplacePanel = this.container.querySelector('.find-replace-panel');
            this.findInput = this.container.querySelector('.find-input');
            this.replaceInput = this.container.querySelector('.replace-input');
            if (this.state && this.state.content && this.editor) {
                this.editor.value = this.state.content;
            }
            this.editor?.addEventListener('input', () => this._handleInput());
            this.editor?.addEventListener('click', () => this._updateCursorPosition());
            this.editor?.addEventListener('keyup', () => this._updateCursorPosition());
            this.editor?.addEventListener('select', () => this._updateCursorPosition());
            this.container.addEventListener('click', (e) => {
                const target = e.target;
                const btn = target?.closest('[data-action]');
                if (!btn)
                    return;
                const action = btn.getAttribute('data-action');
                this._handleAction(action);
            });
            if (this.fileInput) {
                this.fileInput.addEventListener('change', (e) => this._handleFileOpen(e));
            }
            this._updateWordCount();
            this._updateCursorPosition();
            this._loadWrapPreference();
        }
        _handleAction(action) {
            const actions = {
                clear: () => this.clearContent(),
                open: () => this.openFile(),
                save: () => this.saveFile(),
                bold: () => this._wrapSelection('**', '**'),
                italic: () => this._wrapSelection('*', '*'),
                underline: () => this._wrapSelection('<u>', '</u>'),
                find: () => this.toggleFindReplace(),
                toggleWrap: () => this.toggleWrapMode(),
                findNext: () => this.findNext(),
                replaceOne: () => this.replaceOne(),
                replaceAll: () => this.replaceAll(),
                closeFindReplace: () => this.closeFindReplace(),
            };
            if (actions[action])
                actions[action]();
        }
        _handleInput() {
            this.isDirty = true;
            if (this.editor) {
                this.updateState({ content: this.editor.value });
                this._updateWordCount();
                this._updateSaveButton();
                const emit = Base.prototype.emit;
                emit.call(this, 'contentChanged', { content: this.editor.value });
            }
        }
        _updateWordCount() {
            if (!this.editor || !this.wordCountDisplay)
                return;
            const text = this.editor.value;
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            const chars = text.length;
            this.wordCountDisplay.textContent = `Wörter: ${words} | Zeichen: ${chars}`;
        }
        _updateCursorPosition() {
            if (!this.editor || !this.lineColDisplay)
                return;
            const pos = this.editor.selectionStart;
            const textBeforeCursor = this.editor.value.substring(0, pos);
            const line = (textBeforeCursor.match(/\n/g) || []).length + 1;
            const lastNewline = textBeforeCursor.lastIndexOf('\n');
            const col = pos - lastNewline;
            this.lineColDisplay.textContent = `Zeile ${line}, Spalte ${col}`;
            this.updateState({ cursorPosition: { line, col } });
        }
        _updateSaveButton() {
            if (!this.saveButton)
                return;
            if (this.isDirty) {
                this.saveButton.style.fontWeight = 'bold';
                this.saveButton.setAttribute('title', 'Änderungen speichern');
            }
            else {
                this.saveButton.style.fontWeight = 'normal';
                this.saveButton.setAttribute('title', 'Speichern');
            }
        }
        clearContent() {
            if (this.isDirty && !confirm('Ungespeicherte Änderungen gehen verloren. Fortfahren?')) {
                return;
            }
            if (this.editor)
                this.editor.value = '';
            this.currentFilename = 'Untitled.txt';
            this.isDirty = false;
            this.updateState({ content: '', filename: this.currentFilename });
            this._updateWordCount();
            this._updateSaveButton();
            this._hideStatusBar();
            const emit = Base.prototype.emit;
            emit.call(this, 'contentCleared');
        }
        openFile() {
            this.fileInput?.click();
        }
        _handleFileOpen(event) {
            const target = event.target;
            const file = target?.files?.[0];
            if (!file)
                return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target.result;
                if (this.editor)
                    this.editor.value = result;
                this.currentFilename = file.name;
                this.isDirty = false;
                this.updateState({ content: result, filename: file.name });
                this._updateWordCount();
                this._updateSaveButton();
                this._showStatusBar(`Geöffnet: ${file.name}`);
                const emit = Base.prototype.emit;
                emit.call(this, 'fileOpened', { filename: file.name });
            };
            reader.readAsText(file);
        }
        saveFile() {
            const content = this.editor?.value || '';
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.currentFilename;
            a.click();
            URL.revokeObjectURL(url);
            this.isDirty = false;
            this._updateSaveButton();
            this._showStatusBar(`Gespeichert: ${this.currentFilename}`);
            const emit = Base.prototype.emit;
            emit.call(this, 'fileSaved', { filename: this.currentFilename });
        }
        _wrapSelection(before, after) {
            if (!this.editor)
                return;
            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            const selectedText = this.editor.value.substring(start, end);
            const replacement = before + selectedText + after;
            this.editor.setRangeText(replacement, start, end, 'select');
            this.editor.focus();
            this._handleInput();
        }
        toggleWrapMode() {
            this.wrapMode = this.wrapMode === 'soft' ? 'off' : 'soft';
            if (this.editor) {
                this.editor.wrap = this.wrapMode;
                this.editor.style.whiteSpace = this.wrapMode === 'soft' ? 'pre-wrap' : 'pre';
            }
            try {
                localStorage.setItem(`textEditorWrapMode_${this.instanceId}`, this.wrapMode);
            }
            catch (e) {
                console.warn('Could not save wrap mode', e);
            }
            this.updateState({ wrapMode: this.wrapMode });
            this._showStatusBar(this.wrapMode === 'soft' ? 'Zeilenumbruch aktiviert' : 'Zeilenumbruch deaktiviert');
        }
        _loadWrapPreference() {
            try {
                const id = this.instanceId;
                const saved = localStorage.getItem(`textEditorWrapMode_${id}`);
                if (saved && this.editor) {
                    this.wrapMode = saved;
                    this.editor.wrap = this.wrapMode;
                    this.editor.style.whiteSpace = this.wrapMode === 'soft' ? 'pre-wrap' : 'pre';
                }
            }
            catch (e) {
                console.warn('Could not load wrap mode', e);
            }
        }
        toggleFindReplace() {
            if (!this.findReplacePanel)
                return;
            const isHidden = this.findReplacePanel.style.display === 'none';
            this.findReplacePanel.style.display = isHidden ? 'flex' : 'none';
            if (isHidden && this.findInput)
                this.findInput.focus();
            else
                this.editor?.focus();
        }
        closeFindReplace() {
            if (this.findReplacePanel) {
                this.findReplacePanel.style.display = 'none';
                this.editor?.focus();
            }
        }
        findNext() {
            if (!this.findInput || !this.editor)
                return;
            const searchText = this.findInput.value;
            if (!searchText)
                return;
            const content = this.editor.value;
            const currentPos = this.editor.selectionEnd;
            const index = content.indexOf(searchText, currentPos);
            if (index !== -1) {
                this.editor.setSelectionRange(index, index + searchText.length);
                this.editor.focus();
            }
            else {
                const firstIndex = content.indexOf(searchText);
                if (firstIndex !== -1) {
                    this.editor.setSelectionRange(firstIndex, firstIndex + searchText.length);
                    this.editor.focus();
                }
                else {
                    this._showStatusBar('Nicht gefunden');
                }
            }
        }
        replaceOne() {
            if (!this.findInput || !this.replaceInput || !this.editor)
                return;
            const searchText = this.findInput.value;
            const replaceText = this.replaceInput.value;
            if (!searchText)
                return;
            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            const selectedText = this.editor.value.substring(start, end);
            if (selectedText === searchText) {
                this.editor.setRangeText(replaceText, start, end, 'end');
                this._handleInput();
            }
            this.findNext();
        }
        replaceAll() {
            if (!this.findInput || !this.replaceInput || !this.editor)
                return;
            const searchText = this.findInput.value;
            const replaceText = this.replaceInput.value;
            if (!searchText)
                return;
            const newContent = this.editor.value.split(searchText).join(replaceText);
            const count = (this.editor.value.match(new RegExp(searchText, 'g')) || []).length;
            this.editor.value = newContent;
            this._handleInput();
            this._showStatusBar(`${count} Ersetzungen vorgenommen`);
        }
        _showStatusBar(message) {
            if (!this.statusBar)
                return;
            this.statusBar.textContent = message;
            this.statusBar.style.display = 'block';
            setTimeout(() => this._hideStatusBar(), 3000);
        }
        _hideStatusBar() {
            if (this.statusBar)
                this.statusBar.style.display = 'none';
        }
        focus() {
            const baseFocus = Base.prototype.focus;
            baseFocus.call(this);
            this.editor?.focus();
        }
        serialize() {
            const baseSerialize = Base.prototype.serialize;
            const baseObj = baseSerialize.call(this);
            return {
                ...baseObj,
                content: this.editor?.value || '',
                filename: this.currentFilename,
                wrapMode: this.wrapMode,
                isDirty: this.isDirty,
            };
        }
        deserialize(data) {
            const baseDeserialize = Base.prototype.deserialize;
            baseDeserialize.call(this, data);
            const d = data;
            if (d.content && this.editor) {
                this.editor.value = d.content;
                this._updateWordCount();
            }
            if (d.filename)
                this.currentFilename = d.filename;
            if (d.wrapMode) {
                this.wrapMode = d.wrapMode;
                if (this.editor) {
                    this.editor.wrap = this.wrapMode;
                    this.editor.style.whiteSpace = this.wrapMode === 'soft' ? 'pre-wrap' : 'pre';
                }
            }
            if (typeof d.isDirty !== 'undefined') {
                this.isDirty = d.isDirty;
                this._updateSaveButton();
            }
        }
    }
    window.TextEditorInstance = TextEditorInstance;
    const G = window;
    const InstanceManager = G['InstanceManager'];
    if (InstanceManager) {
        G['TextEditorInstanceManager'] = new InstanceManager({
            type: 'text-editor',
            instanceClass: TextEditorInstance,
            maxInstances: 0,
            createContainer: function (instanceId) {
                const editorModalContainer = document.getElementById('text-editor-container');
                if (!editorModalContainer) {
                    console.error('Text editor container not found');
                    return null;
                }
                const container = document.createElement('div');
                container.id = `${instanceId}-container`;
                container.className = 'text-editor-instance-container h-full';
                container.classList.add('hidden');
                editorModalContainer.appendChild(container);
                return container;
            },
        });
    }
})();
//# sourceMappingURL=text-editor-instance.js.map