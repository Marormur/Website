/**
 * src/ts/text-editor-document.ts
 * Text editor document as a tab within an editor window
 */

import { BaseTab, type TabConfig, type TabState } from '../../windows/base-tab.js';
import { getString, setString } from '../../services/storage-utils.js';
import logger from '../../core/logger.js';

type WrapMode = 'off' | 'soft';

/**
 * TextEditorDocument - Individual document tab
 *
 * Features:
 * - Text editing with formatting
 * - Find & replace
 * - Word/character count
 * - Line/column tracking
 */
export class TextEditorDocument extends BaseTab {
    editor: HTMLTextAreaElement | null;
    statusBar: HTMLElement | null;
    wordCountDisplay: HTMLElement | null;
    lineColDisplay: HTMLElement | null;
    findReplacePanel: HTMLElement | null;
    findInput: HTMLInputElement | null;
    replaceInput: HTMLInputElement | null;
    fileInput: HTMLInputElement | null;

    wrapMode: WrapMode;
    filename: string;
    isDirty: boolean;

    constructor(config?: Partial<TabConfig>) {
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
    createDOM(): HTMLElement {
        const container = document.createElement('div');
        container.id = `${this.id}-container`;
        container.className = 'tab-content hidden w-full h-full';

        container.innerHTML = `
            <div class="text-editor-wrapper flex flex-col h-full">
                <!-- Toolbar -->
                <div class="text-editor-toolbar flex-none">
                    <div class="text-editor-toolbar-group">
                        <button type="button" class="text-editor-btn btn-new" title="Neu">Neu</button>
                        <button type="button" class="text-editor-btn btn-open" title="Öffnen">Öffnen</button>
                        <button type="button" class="text-editor-btn text-editor-btn-accent btn-save" title="Speichern">Speichern</button>
                    </div>
                    <div class="text-editor-toolbar-divider" aria-hidden="true"></div>
                    <div class="text-editor-toolbar-group">
                        <button type="button" class="text-editor-btn btn-bold" title="Fett"><strong>B</strong></button>
                        <button type="button" class="text-editor-btn btn-italic" title="Kursiv"><em>I</em></button>
                        <button type="button" class="text-editor-btn btn-underline" title="Unterstrichen"><span class="text-editor-btn-underline">U</span></button>
                    </div>
                    <div class="text-editor-toolbar-divider" aria-hidden="true"></div>
                    <div class="text-editor-toolbar-group text-editor-toolbar-group-right">
                        <button type="button" class="text-editor-btn btn-find" title="Suchen">Suchen</button>
                        <button type="button" class="text-editor-btn btn-wrap" title="Zeilenumbruch">Wrap</button>
                    </div>
                    <input type="file" class="file-input" accept=".txt,.md,.markdown" style="display:none">
                </div>

                <!-- Find/Replace Panel -->
                <div class="find-replace-panel" hidden>
                    <input type="text" class="find-input text-editor-input" placeholder="Suchen...">
                    <input type="text" class="replace-input text-editor-input" placeholder="Ersetzen...">
                    <button type="button" class="text-editor-btn btn-find-next">Weiter</button>
                    <button type="button" class="text-editor-btn btn-replace-one">Ersetzen</button>
                    <button type="button" class="text-editor-btn btn-replace-all">Alle</button>
                    <button type="button" class="text-editor-btn btn-close-find" aria-label="Suchen schließen">✕</button>
                </div>

                <!-- Status -->
                <div class="status-bar text-file-status"></div>

                <!-- Editor -->
                <textarea class="text-editor-textarea flex-1 w-full resize-none p-4 border-0 outline-none"
                    spellcheck="false"
                    wrap="off"
                    placeholder="Text eingeben..."></textarea>

                <!-- Status Bar -->
                <div class="editor-statusbar text-editor-statusbar flex-none">
                    <span class="word-count editor-status-pill">Wörter: 0 | Zeichen: 0</span>
                    <span class="line-col editor-status-pill">Zeile 1, Spalte 1</span>
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
        this._loadWrapPreference();

        // Load initial content if any
        const state = this.contentState as { content?: string } | undefined;
        if (state && state.content && this.editor) {
            this.editor.value = state.content;
            this._updateWordCount();
            this._updateCursorPosition();
        }

        return container;
    }

    private _attachEventListeners(): void {
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

    private _handleInput(): void {
        this.isDirty = true;
        if (this.editor) {
            this.updateContentState({ content: this.editor.value });
            this._updateWordCount();
        }
    }

    private _updateWordCount(): void {
        if (!this.editor || !this.wordCountDisplay) return;
        const text = this.editor.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        this.wordCountDisplay.textContent = `Wörter: ${words} | Zeichen: ${chars}`;
    }

    private _updateCursorPosition(): void {
        if (!this.editor || !this.lineColDisplay) return;
        const pos = this.editor.selectionStart;
        const textBeforeCursor = this.editor.value.substring(0, pos);
        const line = (textBeforeCursor.match(/\n/g) || []).length + 1;
        const lastNewline = textBeforeCursor.lastIndexOf('\n');
        const col = pos - lastNewline;
        this.lineColDisplay.textContent = `Zeile ${line}, Spalte ${col}`;
    }

    clearContent(): void {
        if (this.isDirty && !confirm('Ungespeicherte Änderungen gehen verloren. Fortfahren?'))
            return;
        if (this.editor) this.editor.value = '';
        this.filename = 'Untitled.txt';
        this.isDirty = false;
        this.setTitle(this.filename);
        this.updateContentState({ content: '' });
        this._updateWordCount();
    }

    openFile(): void {
        this.fileInput?.click();
    }

    private _handleFileOpen(event: Event): void {
        const target = event.target as HTMLInputElement;
        const file = target?.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => {
            const content = (e.target as FileReader).result as string;
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

    saveFile(): void {
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

    private _wrapSelection(before: string, after: string): void {
        if (!this.editor) return;
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const selectedText = this.editor.value.substring(start, end);
        const replacement = before + selectedText + after;
        this.editor.setRangeText(replacement, start, end, 'select');
        this.editor.focus();
        this._handleInput();
    }

    toggleWrapMode(): void {
        this.wrapMode = this.wrapMode === 'soft' ? 'off' : 'soft';
        if (this.editor) {
            this.editor.wrap = this.wrapMode;
            this.editor.style.whiteSpace = this.wrapMode === 'soft' ? 'pre-wrap' : 'pre';
        }
        try {
            setString(`textEditorWrapMode_${this.id}`, this.wrapMode);
        } catch (e) {
            logger.warn('UI', 'Could not save wrap mode', e);
        }
        this.updateContentState({ wrapMode: this.wrapMode });
    }

    private _loadWrapPreference(): void {
        try {
            const saved = getString(`textEditorWrapMode_${this.id}`) as WrapMode | null;
            if (saved && this.editor) {
                this.wrapMode = saved;
                this.editor.wrap = this.wrapMode;
                this.editor.style.whiteSpace = this.wrapMode === 'soft' ? 'pre-wrap' : 'pre';
            }
        } catch (e) {
            logger.warn('UI', 'Could not load wrap mode', e);
        }
    }

    toggleFindReplace(): void {
        if (!this.findReplacePanel) return;
        const isHidden = this.findReplacePanel.hasAttribute('hidden');
        if (isHidden) this.findReplacePanel.removeAttribute('hidden');
        else this.findReplacePanel.setAttribute('hidden', '');
        if (isHidden && this.findInput) this.findInput.focus();
        else this.editor?.focus();
    }

    closeFindReplace(): void {
        if (this.findReplacePanel) {
            this.findReplacePanel.setAttribute('hidden', '');
            this.editor?.focus();
        }
    }

    findNext(): void {
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

    replaceOne(): void {
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

    replaceAll(): void {
        if (!this.findInput || !this.replaceInput || !this.editor) return;
        const searchText = this.findInput.value;
        const replaceText = this.replaceInput.value;
        if (!searchText) return;
        const count = (this.editor.value.match(new RegExp(searchText, 'g')) || []).length;
        this.editor.value = this.editor.value.split(searchText).join(replaceText);
        this._handleInput();
        this._showStatus(`${count} Ersetzungen`);
    }

    private _showStatus(message: string): void {
        if (!this.statusBar) return;
        this.statusBar.textContent = message;
        this.statusBar.classList.add('is-visible');
        setTimeout(() => {
            this.statusBar?.classList.remove('is-visible');
        }, 3000);
    }

    /**
     * Serialize document state
     */
    serialize(): TabState {
        return {
            ...super.serialize(),
            filename: this.filename,
            wrapMode: this.wrapMode,
            isDirty: this.isDirty,
        } as TabState;
    }

    static deserialize(state: TabState & Record<string, unknown>): TextEditorDocument {
        const doc = new TextEditorDocument({
            id: state['id'] as string | undefined,
            title:
                (state['title'] as string | undefined) || (state['filename'] as string | undefined),
            content: state['contentState'] as { content?: string } | undefined,
        });

        if (state['filename']) doc.filename = state['filename'] as string;
        if (state['wrapMode']) doc.wrapMode = state['wrapMode'] as WrapMode;
        if (state['isDirty'] !== undefined) doc.isDirty = state['isDirty'] as boolean;

        return doc;
    }

    /**
     * Focus editor when tab is shown
     */
    protected onShow(): void {
        if (this.editor && typeof this.editor.focus === 'function') {
            this.editor.focus();
        }
    }
}

// Export to window
window.TextEditorDocument = TextEditorDocument;
