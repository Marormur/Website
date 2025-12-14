'use strict';
/**
 * src/ts/text-editor-document.ts
 * Text editor document as a tab within an editor window
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, '__esModule', { value: true });
exports.TextEditorDocument = void 0;
const base_tab_js_1 = require('../../windows/base-tab.js');
const storage_utils_js_1 = require('../../services/storage-utils.js');
/**
 * TextEditorDocument - Individual document tab
 *
 * Features:
 * - Text editing with formatting
 * - Find & replace
 * - Word/character count
 * - Line/column tracking
 */
class TextEditorDocument extends base_tab_js_1.BaseTab {
    constructor(config) {
        super({
            type: 'text-editor-document',
            title: config?.title || 'Untitled.txt',
            ...config,
        });
        this.editor = null;
        this.statusBar = null;
        this.wordCountDisplay = null;
        this.lineColDisplay = null;
        this.findReplacePanel = null;
        this.findInput = null;
        this.replaceInput = null;
        this.fileInput = null;
        this.wrapMode = 'off';
        this.filename = this.title;
        this.isDirty = false;
    }
    /**
     * Create document DOM
     */
    createDOM() {
        const container = document.createElement('div');
        container.id = `${this.id}-container`;
        container.className = 'tab-content hidden w-full h-full';
        const isDark = document.documentElement.classList.contains('dark');
        container.innerHTML = `
            <div class="text-editor-wrapper flex flex-col h-full" style="background: ${isDark ? '#0f172a' : '#fafafa'}; color: ${isDark ? '#e5e7eb' : '#111827'};">
                <!-- Toolbar -->
                <div class="text-editor-toolbar flex-none" style="background: ${isDark ? '#1f2937' : '#f5f5f5'}; padding: 8px 12px; border-bottom: 1px solid ${isDark ? '#374151' : '#d1d5db'}; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <button type="button" class="btn-new" title="Neu">Neu</button>
                    <button type="button" class="btn-open" title="Öffnen">Öffnen</button>
                    <button type="button" class="btn-save" title="Speichern">Speichern</button>
                    <div style="width: 1px; height: 20px; background: ${isDark ? '#475569' : '#d1d5db'}; margin: 0 4px;"></div>
                    <button type="button" class="btn-bold" title="Fett" style="font-weight: bold;">B</button>
                    <button type="button" class="btn-italic" title="Kursiv" style="font-style: italic;">I</button>
                    <button type="button" class="btn-underline" title="Unterstrichen" style="text-decoration: underline;">U</button>
                    <div style="width: 1px; height: 20px; background: ${isDark ? '#475569' : '#d1d5db'}; margin: 0 4px;"></div>
                    <button type="button" class="btn-find" title="Suchen">🔍</button>
                    <button type="button" class="btn-wrap" title="Zeilenumbruch">⏎</button>
                    <input type="file" class="file-input" accept=".txt,.md,.markdown" style="display:none">
                </div>

                <!-- Find/Replace Panel -->
                <div class="find-replace-panel" style="background: ${isDark ? '#1f2937' : '#f5f5f5'}; padding: 8px 12px; border-bottom: 1px solid ${isDark ? '#374151' : '#d1d5db'}; display: none; gap: 8px; align-items: center;">
                    <input type="text" class="find-input" placeholder="Suchen..." style="padding: 4px 8px; border: 1px solid ${isDark ? '#475569' : '#d1d5db'}; border-radius: 4px; background: ${isDark ? '#111827' : '#ffffff'}; color: inherit;">
                    <input type="text" class="replace-input" placeholder="Ersetzen..." style="padding: 4px 8px; border: 1px solid ${isDark ? '#475569' : '#d1d5db'}; border-radius: 4px; background: ${isDark ? '#111827' : '#ffffff'}; color: inherit;">
                    <button type="button" class="btn-find-next">Weiter</button>
                    <button type="button" class="btn-replace-one">Ersetzen</button>
                    <button type="button" class="btn-replace-all">Alle</button>
                    <button type="button" class="btn-close-find">✕</button>
                </div>

                <!-- Status -->
                <div class="status-bar" style="padding: 6px 12px; border-bottom: 1px solid ${isDark ? '#374151' : '#d1d5db'}; background: ${isDark ? '#1f2937' : '#f5f5f5'}; font-size: 13px; display: none;"></div>

                <!-- Editor -->
                <textarea class="text-editor-textarea flex-1 w-full resize-none p-4 border-0 outline-none"
                    spellcheck="false"
                    wrap="off"
                    style="background: ${isDark ? '#111827' : '#ffffff'}; color: inherit; font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, monospace; font-size: 14px; line-height: 1.6;"
                    placeholder="Text eingeben..."></textarea>

                <!-- Status Bar -->
                <div class="editor-statusbar flex-none" style="background: ${isDark ? '#1f2937' : '#f5f5f5'}; padding: 6px 12px; border-top: 1px solid ${isDark ? '#374151' : '#d1d5db'}; font-size: 12px; display: flex; justify-content: space-between;">
                    <span class="word-count">Wörter: 0 | Zeichen: 0</span>
                    <span class="line-col">Zeile 1, Spalte 1</span>
                </div>
            </div>
        `;
        this.element = container;
        // Get element references
        this.editor = container.querySelector('.text-editor-textarea');
        this.statusBar = container.querySelector('.status-bar');
        this.wordCountDisplay = container.querySelector('.word-count');
        this.lineColDisplay = container.querySelector('.line-col');
        this.findReplacePanel = container.querySelector('.find-replace-panel');
        this.findInput = container.querySelector('.find-input');
        this.replaceInput = container.querySelector('.replace-input');
        this.fileInput = container.querySelector('.file-input');
        this._attachEventListeners();
        this._applyButtonStyles();
        this._loadWrapPreference();
        // Load initial content if any
        if (this.contentState && this.contentState.content && this.editor) {
            this.editor.value = this.contentState.content;
            this._updateWordCount();
            this._updateCursorPosition();
        }
        return container;
    }
    _attachEventListeners() {
        if (!this.element) return;
        // Editor events
        this.editor?.addEventListener('input', () => this._handleInput());
        this.editor?.addEventListener('click', () => this._updateCursorPosition());
        this.editor?.addEventListener('keyup', () => this._updateCursorPosition());
        // Toolbar buttons
        this.element
            .querySelector('.btn-new')
            ?.addEventListener('click', () => this.clearContent());
        this.element.querySelector('.btn-open')?.addEventListener('click', () => this.openFile());
        this.element.querySelector('.btn-save')?.addEventListener('click', () => this.saveFile());
        this.element
            .querySelector('.btn-bold')
            ?.addEventListener('click', () => this._wrapSelection('**', '**'));
        this.element
            .querySelector('.btn-italic')
            ?.addEventListener('click', () => this._wrapSelection('*', '*'));
        this.element
            .querySelector('.btn-underline')
            ?.addEventListener('click', () => this._wrapSelection('<u>', '</u>'));
        this.element
            .querySelector('.btn-find')
            ?.addEventListener('click', () => this.toggleFindReplace());
        this.element
            .querySelector('.btn-wrap')
            ?.addEventListener('click', () => this.toggleWrapMode());
        // Find/Replace buttons
        this.element
            .querySelector('.btn-find-next')
            ?.addEventListener('click', () => this.findNext());
        this.element
            .querySelector('.btn-replace-one')
            ?.addEventListener('click', () => this.replaceOne());
        this.element
            .querySelector('.btn-replace-all')
            ?.addEventListener('click', () => this.replaceAll());
        this.element
            .querySelector('.btn-close-find')
            ?.addEventListener('click', () => this.closeFindReplace());
        // File input
        this.fileInput?.addEventListener('change', e => this._handleFileOpen(e));
    }
    _applyButtonStyles() {
        if (!this.element) return;
        const isDark = document.documentElement.classList.contains('dark');
        const buttons = this.element.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.style.cssText = `
                padding: 6px 12px;
                font-size: 13px;
                border: 1px solid ${isDark ? '#475569' : '#d1d5db'};
                background: ${isDark ? '#111827' : '#ffffff'};
                color: inherit;
                border-radius: 6px;
                cursor: pointer;
            `;
        });
    }
    _handleInput() {
        this.isDirty = true;
        if (this.editor) {
            this.updateContentState({ content: this.editor.value });
            this._updateWordCount();
        }
    }
    _updateWordCount() {
        if (!this.editor || !this.wordCountDisplay) return;
        const text = this.editor.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        this.wordCountDisplay.textContent = `Wörter: ${words} | Zeichen: ${chars}`;
    }
    _updateCursorPosition() {
        if (!this.editor || !this.lineColDisplay) return;
        const pos = this.editor.selectionStart;
        const textBeforeCursor = this.editor.value.substring(0, pos);
        const line = (textBeforeCursor.match(/\n/g) || []).length + 1;
        const lastNewline = textBeforeCursor.lastIndexOf('\n');
        const col = pos - lastNewline;
        this.lineColDisplay.textContent = `Zeile ${line}, Spalte ${col}`;
    }
    clearContent() {
        if (this.isDirty && !confirm('Ungespeicherte Änderungen gehen verloren. Fortfahren?'))
            return;
        if (this.editor) this.editor.value = '';
        this.filename = 'Untitled.txt';
        this.isDirty = false;
        this.setTitle(this.filename);
        this.updateContentState({ content: '' });
        this._updateWordCount();
    }
    openFile() {
        this.fileInput?.click();
    }
    _handleFileOpen(event) {
        const target = event.target;
        const file = target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            const content = e.target.result;
            if (this.editor) this.editor.value = content;
            this.filename = file.name;
            this.setTitle(this.filename);
            this.isDirty = false;
            this.updateContentState({ content });
            this._updateWordCount();
            this._showStatus(`Geöffnet: ${file.name}`);
        };
        reader.readAsText(file);
    }
    saveFile() {
        const content = this.editor?.value || '';
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.filename;
        a.click();
        URL.revokeObjectURL(url);
        this.isDirty = false;
        this._showStatus(`Gespeichert: ${this.filename}`);
    }
    _wrapSelection(before, after) {
        if (!this.editor) return;
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
            (0, storage_utils_js_1.setString)(`textEditorWrapMode_${this.id}`, this.wrapMode);
        } catch (e) {
            console.warn('Could not save wrap mode', e);
        }
        this.updateContentState({ wrapMode: this.wrapMode });
    }
    _loadWrapPreference() {
        try {
            const saved = (0, storage_utils_js_1.getString)(`textEditorWrapMode_${this.id}`);
            if (saved && this.editor) {
                this.wrapMode = saved;
                this.editor.wrap = this.wrapMode;
                this.editor.style.whiteSpace = this.wrapMode === 'soft' ? 'pre-wrap' : 'pre';
            }
        } catch (e) {
            console.warn('Could not load wrap mode', e);
        }
    }
    toggleFindReplace() {
        if (!this.findReplacePanel) return;
        const isHidden = this.findReplacePanel.style.display === 'none';
        this.findReplacePanel.style.display = isHidden ? 'flex' : 'none';
        if (isHidden && this.findInput) this.findInput.focus();
        else this.editor?.focus();
    }
    closeFindReplace() {
        if (this.findReplacePanel) {
            this.findReplacePanel.style.display = 'none';
            this.editor?.focus();
        }
    }
    findNext() {
        if (!this.findInput || !this.editor) return;
        const searchText = this.findInput.value;
        if (!searchText) return;
        const content = this.editor.value;
        const currentPos = this.editor.selectionEnd;
        const index = content.indexOf(searchText, currentPos);
        if (index !== -1) {
            this.editor.setSelectionRange(index, index + searchText.length);
            this.editor.focus();
        } else {
            const firstIndex = content.indexOf(searchText);
            if (firstIndex !== -1) {
                this.editor.setSelectionRange(firstIndex, firstIndex + searchText.length);
                this.editor.focus();
            }
        }
    }
    replaceOne() {
        if (!this.findInput || !this.replaceInput || !this.editor) return;
        const searchText = this.findInput.value;
        const replaceText = this.replaceInput.value;
        if (!searchText) return;
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
        if (!this.findInput || !this.replaceInput || !this.editor) return;
        const searchText = this.findInput.value;
        const replaceText = this.replaceInput.value;
        if (!searchText) return;
        const count = (this.editor.value.match(new RegExp(searchText, 'g')) || []).length;
        this.editor.value = this.editor.value.split(searchText).join(replaceText);
        this._handleInput();
        this._showStatus(`${count} Ersetzungen`);
    }
    _showStatus(message) {
        if (!this.statusBar) return;
        this.statusBar.textContent = message;
        this.statusBar.style.display = 'block';
        setTimeout(() => {
            if (this.statusBar) this.statusBar.style.display = 'none';
        }, 3000);
    }
    /**
     * Serialize document state
     */
    serialize() {
        return {
            ...super.serialize(),
            filename: this.filename,
            wrapMode: this.wrapMode,
            isDirty: this.isDirty,
        };
    }
    /**
     * Restore document from state
     */
    static deserialize(state) {
        const doc = new TextEditorDocument({
            id: state.id,
            title: state.title || state.filename,
            content: state.contentState,
        });
        if (state.filename) doc.filename = state.filename;
        if (state.wrapMode) doc.wrapMode = state.wrapMode;
        if (state.isDirty !== undefined) doc.isDirty = state.isDirty;
        return doc;
    }
    /**
     * Focus editor when tab is shown
     */
    onShow() {
        if (this.editor && typeof this.editor.focus === 'function') {
            this.editor.focus();
        }
    }
}
exports.TextEditorDocument = TextEditorDocument;
// Export to window
window.TextEditorDocument = TextEditorDocument;
//# sourceMappingURL=text-editor-document.js.map
