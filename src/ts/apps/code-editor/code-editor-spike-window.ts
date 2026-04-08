/**
 * Phase-1A core implementation for the Monaco-based code editor window.
 * The file tab strip is rendered inside the app content to match VSCode behavior.
 */

import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import { BaseTab, type TabConfig } from '../../windows/base-tab.js';
import {
    focusOrCreateWindowByType,
    showAndRegisterWindow,
} from '../../framework/controls/window-lifecycle.js';
import logger from '../../core/logger.js';

import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js';

type MonacoViewState = unknown;

type MonacoTextModel = {
    getAlternativeVersionId?: () => number;
    setValue: (value: string) => void;
    dispose: () => void;
};

type MonacoStandaloneEditor = {
    layout: () => void;
    onDidChangeModelContent: (listener: () => void) => void;
    setModel: (model: MonacoTextModel) => void;
    saveViewState: () => MonacoViewState | null;
    restoreViewState: (state: MonacoViewState) => void;
    focus: () => void;
    dispose: () => void;
};

type MonacoModule = {
    Uri: {
        parse: (value: string) => unknown;
    };
    editor: {
        setTheme: (theme: 'vs' | 'vs-dark') => void;
        create: (
            container: HTMLElement,
            options: {
                value: string;
                language: string;
                theme: 'vs' | 'vs-dark';
                automaticLayout: boolean;
                fontFamily: string;
                fontSize: number;
                minimap: { enabled: boolean };
                smoothScrolling: boolean;
                scrollBeyondLastLine: boolean;
            }
        ) => MonacoStandaloneEditor;
        createModel: (value: string, language: string, uri: unknown) => MonacoTextModel;
    };
};

type EditorDoc = {
    id: string;
    filename: string;
    language: string;
    model: MonacoTextModel;
    viewState: MonacoViewState | null;
    isDirty: boolean;
    savedVersionId: number;
};

const CODE_FONT_STACK = "Menlo, Monaco, 'SF Mono', Consolas, 'Liberation Mono', monospace";
const DEFAULT_SOURCE = [
    'function helloCodeEditor(name: string): string {',
    '    return `Hello ${name}`;',
    '}',
    '',
    "console.log(helloCodeEditor('Phase 1A'));",
].join('\n');

let monacoModulePromise: Promise<MonacoModule> | null = null;
let monacoWorkersConfigured = false;

function ensureMonacoWorkersConfigured(): void {
    if (monacoWorkersConfigured) return;

    window.MonacoEnvironment = {
        getWorker: (_workerId: string, label: string) => {
            const workerPath =
                label === 'json'
                    ? './js/monaco-workers/json.worker.js'
                    : './js/monaco-workers/editor.worker.js';
            return new Worker(workerPath);
        },
    };

    monacoWorkersConfigured = true;
}

function resolveMonacoTheme(): 'vs' | 'vs-dark' {
    return document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs';
}

function inferLanguageFromFilename(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop() || '';
    if (ext === 'ts' || ext === 'tsx') return 'typescript';
    if (ext === 'js' || ext === 'jsx' || ext === 'mjs') return 'javascript';
    if (ext === 'json') return 'json';
    if (ext === 'md' || ext === 'markdown') return 'markdown';
    if (ext === 'css') return 'css';
    if (ext === 'html' || ext === 'htm') return 'html';
    if (ext === 'yml' || ext === 'yaml') return 'yaml';
    return 'plaintext';
}

async function loadMonacoModule(): Promise<MonacoModule> {
    if (!monacoModulePromise) {
        monacoModulePromise = (async () => {
            ensureMonacoWorkersConfigured();
            const startedAt = performance.now();
            const mod = await import('monaco-editor/esm/vs/editor/editor.api.js');
            const loadDurationMs = Math.round(performance.now() - startedAt);
            logger.info('CODE_EDITOR', `[Phase1A] Monaco loaded in ${loadDurationMs}ms`);
            return mod;
        })();
    }

    return monacoModulePromise;
}

class CodeEditorWorkbenchTab extends BaseTab {
    private editor: MonacoStandaloneEditor | null = null;
    private monaco: MonacoModule | null = null;
    private editorHost: HTMLDivElement | null = null;
    private tabsHost: HTMLDivElement | null = null;
    private statusNode: HTMLDivElement | null = null;
    private newFileButton: HTMLButtonElement | null = null;
    private themeObserver: MutationObserver | null = null;
    private editorInitPromise: Promise<void> | null = null;
    private docs = new Map<string, EditorDoc>();
    private activeDocId: string | null = null;
    private untitledCounter = 1;

    private runWhenReady(action: () => void): void {
        void this.ensureEditorReady()
            .then(() => {
                if (!this.monaco || !this.editor) return;
                action();
            })
            .catch(error => {
                logger.warn('CODE_EDITOR', '[Phase1A] Deferred editor action failed', error);
            });
    }

    constructor(config?: Partial<TabConfig>) {
        super({
            type: 'code-editor-workbench-tab',
            title: config?.title || 'Code Editor',
            ...config,
        });
    }

    createDOM(): HTMLElement {
        const container = document.createElement('section');
        container.id = `${this.id}-container`;
        container.className = 'tab-content hidden w-full h-full code-editor-workbench-tab';

        const root = document.createElement('div');
        root.className = 'code-editor-root';

        const header = document.createElement('div');
        header.className = 'code-editor-header';

        const tabsHost = document.createElement('div');
        tabsHost.className = 'code-editor-file-tabs';
        tabsHost.setAttribute('role', 'tablist');
        tabsHost.setAttribute('aria-label', 'Open files');

        const newFileButton = document.createElement('button');
        newFileButton.type = 'button';
        newFileButton.className = 'code-editor-new-file';
        newFileButton.textContent = 'New File';
        newFileButton.setAttribute('aria-label', 'Create a new file tab');

        header.append(tabsHost, newFileButton);

        const editorHost = document.createElement('div');
        editorHost.className = 'code-editor-surface';
        editorHost.setAttribute('role', 'region');
        editorHost.setAttribute('aria-label', 'Code editor');

        const status = document.createElement('div');
        status.className = 'code-editor-status';
        status.textContent = 'Loading Monaco...';

        root.append(header, editorHost, status);
        container.append(root);

        this.editorHost = editorHost;
        this.tabsHost = tabsHost;
        this.statusNode = status;
        this.newFileButton = newFileButton;
        this.element = container;

        this.newFileButton.addEventListener('click', () => {
            this.createDocument();
        });

        return container;
    }

    protected onShow(): void {
        void this.ensureEditorReady();
        this.editor?.layout();
    }

    protected onHide(): void {
        this.editor?.layout();
    }

    private setStatus(text: string): void {
        if (this.statusNode) {
            this.statusNode.textContent = text;
        }
    }

    private bindThemeSync(monaco: MonacoModule): void {
        if (this.themeObserver) return;

        this.themeObserver = new MutationObserver(() => {
            monaco.editor.setTheme(resolveMonacoTheme());
        });

        this.themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });
    }

    private async ensureEditorReady(): Promise<void> {
        if (this.editor || !this.editorHost) return;
        if (this.editorInitPromise) {
            await this.editorInitPromise;
            return;
        }

        this.editorInitPromise = (async () => {
            this.setStatus('Initializing Monaco...');

            try {
                const monaco = await loadMonacoModule();
                this.monaco = monaco;
                monaco.editor.setTheme(resolveMonacoTheme());

                this.editor = monaco.editor.create(this.editorHost!, {
                    value: '',
                    language: 'typescript',
                    theme: resolveMonacoTheme(),
                    automaticLayout: true,
                    fontFamily: CODE_FONT_STACK,
                    fontSize: 13,
                    minimap: { enabled: true },
                    occurrencesHighlight: 'off',
                    selectionHighlight: false,
                    smoothScrolling: true,
                    scrollBeyondLastLine: false,
                });

                this.editor.onDidChangeModelContent(() => {
                    this.syncDirtyStateFromEditor();
                });

                this.bindThemeSync(monaco);

                if (!this.activeDocId) {
                    this.createDocument({
                        filename: 'main.ts',
                        content: DEFAULT_SOURCE,
                    });
                }

                (window as unknown as Record<string, unknown>).__MONACO_SPIKE__ = {
                    monaco,
                    editor: this.editor,
                    openDocs: () => Array.from(this.docs.values()).map(doc => doc.filename),
                };
                this.setStatus('Code Editor ready');
            } catch (error) {
                logger.error('CODE_EDITOR', '[Phase1A] Monaco init failed', error);
                this.setStatus('Monaco initialization failed. Check console output.');
            } finally {
                this.editorInitPromise = null;
            }
        })();

        await this.editorInitPromise;
    }

    private syncDirtyStateFromEditor(): void {
        if (!this.editor || !this.activeDocId) return;

        const activeDoc = this.docs.get(this.activeDocId);
        if (!activeDoc) return;

        const currentVersion = Number(activeDoc.model.getAlternativeVersionId?.() || 0);
        const wasDirty = activeDoc.isDirty;
        activeDoc.isDirty = currentVersion !== activeDoc.savedVersionId;

        if (activeDoc.isDirty !== wasDirty) {
            this.renderFileTabs();
            this.setStatus(`${activeDoc.filename} · ${activeDoc.language}`);
        }
    }

    private renderFileTabs(): void {
        if (!this.tabsHost) return;

        this.tabsHost.innerHTML = '';

        this.docs.forEach(doc => {
            const tab = document.createElement('div');
            tab.className = `code-editor-file-tab ${doc.id === this.activeDocId ? 'is-active' : ''}`;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', doc.id === this.activeDocId ? 'true' : 'false');

            const activateButton = document.createElement('button');
            activateButton.type = 'button';
            activateButton.className = 'code-editor-file-tab-label';
            activateButton.textContent = doc.isDirty ? `${doc.filename} *` : doc.filename;
            activateButton.addEventListener('click', () => this.activateDocument(doc.id));

            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'code-editor-file-tab-close';
            closeButton.textContent = '×';
            closeButton.setAttribute('aria-label', `Close ${doc.filename}`);
            closeButton.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                this.closeDocument(doc.id);
            });

            tab.append(activateButton, closeButton);
            this.tabsHost?.appendChild(tab);
        });
    }

    createDocument(options?: { filename?: string; content?: string }): string | null {
        if (!this.monaco) {
            this.runWhenReady(() => {
                this.createDocument(options);
            });
            return null;
        }

        const filename = options?.filename || `untitled-${this.untitledCounter++}.ts`;
        const language = inferLanguageFromFilename(filename);
        const modelUri = this.monaco.Uri.parse(
            `inmemory://code-editor/${Date.now()}-${Math.random().toString(16).slice(2)}/${filename}`
        );
        const model = this.monaco.editor.createModel(options?.content || '', language, modelUri);
        const savedVersionId = Number(model.getAlternativeVersionId?.() || 0);

        const doc: EditorDoc = {
            id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            filename,
            language,
            model,
            viewState: null,
            isDirty: false,
            savedVersionId,
        };

        this.docs.set(doc.id, doc);
        this.activateDocument(doc.id);
        return doc.id;
    }

    openDocument(filename: string, content: string): string | null {
        if (!this.monaco) {
            this.runWhenReady(() => {
                this.openDocument(filename, content);
            });
            return null;
        }

        const existing = Array.from(this.docs.values()).find(doc => doc.filename === filename);
        if (existing) {
            existing.model.setValue(content);
            existing.savedVersionId = Number(existing.model.getAlternativeVersionId?.() || 0);
            existing.isDirty = false;
            this.activateDocument(existing.id);
            return existing.id;
        }

        return this.createDocument({ filename, content });
    }

    activateDocument(docId: string): void {
        const doc = this.docs.get(docId);
        if (!doc || !this.editor) return;

        if (this.activeDocId) {
            const previous = this.docs.get(this.activeDocId);
            if (previous) {
                previous.viewState = this.editor.saveViewState();
            }
        }

        this.activeDocId = docId;
        this.editor.setModel(doc.model);
        if (doc.viewState) {
            this.editor.restoreViewState(doc.viewState);
        }
        this.editor.focus();

        this.renderFileTabs();
        this.setStatus(`${doc.filename} · ${doc.language}`);
    }

    closeDocument(docId: string): void {
        const doc = this.docs.get(docId);
        if (!doc) return;

        const wasActive = this.activeDocId === docId;
        const fallbackDoc = wasActive
            ? Array.from(this.docs.values()).find(candidate => candidate.id !== docId) || null
            : null;

        this.docs.delete(docId);

        if (this.docs.size === 0) {
            this.activeDocId = null;
            this.createDocument();
            doc.model.dispose();
            return;
        }

        if (wasActive && fallbackDoc) {
            this.activateDocument(fallbackDoc.id);
            doc.model.dispose();
        } else {
            doc.model.dispose();
            this.renderFileTabs();
        }
    }

    override destroy(): void {
        this.themeObserver?.disconnect();
        this.themeObserver = null;

        this.docs.forEach(doc => doc.model.dispose());
        this.docs.clear();

        if (this.editor) {
            this.editor.dispose();
            this.editor = null;
        }

        this.editorInitPromise = null;
        delete (window as unknown as Record<string, unknown>).__MONACO_SPIKE__;

        super.destroy();
    }
}

export class CodeEditorWindow extends BaseWindow {
    constructor(config?: Partial<WindowConfig>) {
        super({
            type: 'code-editor',
            title: 'Code Editor',
            ...config,
        });
    }

    protected override _renderTabs(): void {
        if (!this.element) return;
        const tabBar = this.element.querySelector(`#${this.id}-tabs`);
        if (!tabBar) return;

        tabBar.innerHTML = '';

        const label = document.createElement('span');
        label.className = 'code-editor-window-label';
        label.textContent = 'Code Editor';
        tabBar.appendChild(label);
    }

    private getWorkbench(): CodeEditorWorkbenchTab | null {
        return (Array.from(this.tabs.values())[0] as CodeEditorWorkbenchTab | undefined) || null;
    }

    private createWorkbenchIfMissing(): CodeEditorWorkbenchTab {
        const existing = this.getWorkbench();
        if (existing) return existing;

        const workbench = new CodeEditorWorkbenchTab({ title: 'Editor' });
        this.addTab(workbench);
        this.setActiveTab(workbench.id);
        return workbench;
    }

    openDocument(filename: string, content: string): string | null {
        const workbench = this.createWorkbenchIfMissing();
        return workbench.openDocument(filename, content);
    }

    createDocument(filename?: string): string | null {
        const workbench = this.createWorkbenchIfMissing();
        return workbench.createDocument({ filename });
    }

    static create(config?: Partial<WindowConfig>): CodeEditorWindow {
        const instance = new CodeEditorWindow(config);
        instance.createWorkbenchIfMissing();
        return showAndRegisterWindow(instance, { requestTabsRender: true });
    }

    static focusOrCreate(config?: Partial<WindowConfig>): CodeEditorWindow {
        return focusOrCreateWindowByType<CodeEditorWindow>({
            type: 'code-editor',
            create: () => CodeEditorWindow.create(config),
            prepareExisting: instance => {
                instance.createWorkbenchIfMissing();
            },
        });
    }
}

window.CodeEditorWindow = CodeEditorWindow;
window.MonacoSpike = {
    open: () => CodeEditorWindow.focusOrCreate(),
};
window.CodeEditorApp = {
    open: () => CodeEditorWindow.focusOrCreate(),
    newFile: (filename?: string) => CodeEditorWindow.focusOrCreate().createDocument(filename),
    openFile: (filename: string, content: string) =>
        CodeEditorWindow.focusOrCreate().openDocument(filename, content),
};
