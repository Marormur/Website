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
import { VirtualFS } from '../../services/virtual-fs.js';

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
    getValue?: () => string;
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
                occurrencesHighlight?: 'off' | 'singleFile' | 'multiFile';
                selectionHighlight?: boolean;
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
    vfsPath: string | null;
    model: MonacoTextModel;
    viewState: MonacoViewState | null;
    isDirty: boolean;
    savedVersionId: number;
};

type VfsEvent = {
    type: string;
    path: string;
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
    private openEditorsHost: HTMLUListElement | null = null;
    private folderTreeHost: HTMLDivElement | null = null;
    private statusNode: HTMLDivElement | null = null;
    private newFileButton: HTMLButtonElement | null = null;
    private saveFileButton: HTMLButtonElement | null = null;
    private importFileButton: HTMLButtonElement | null = null;
    private fileInput: HTMLInputElement | null = null;
    private themeObserver: MutationObserver | null = null;
    private editorInitPromise: Promise<void> | null = null;
    private docs = new Map<string, EditorDoc>();
    private activeDocId: string | null = null;
    private untitledCounter = 1;
    private vfsListener: ((event: VfsEvent) => void) | null = null;
    private expandedFolders = new Set<string>();
    private readonly explorerRootPath = '/home/marvin';

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

        const saveFileButton = document.createElement('button');
        saveFileButton.type = 'button';
        saveFileButton.className = 'code-editor-header-action';
        saveFileButton.textContent = 'Save';
        saveFileButton.setAttribute('aria-label', 'Save active file to workspace');

        const importFileButton = document.createElement('button');
        importFileButton.type = 'button';
        importFileButton.className = 'code-editor-header-action';
        importFileButton.textContent = 'Import';
        importFileButton.setAttribute('aria-label', 'Import local file');

        header.append(tabsHost, newFileButton, saveFileButton, importFileButton);

        const workspace = document.createElement('div');
        workspace.className = 'code-editor-workspace';

        const explorer = document.createElement('aside');
        explorer.className = 'code-editor-explorer';
        explorer.setAttribute('aria-label', 'Explorer');

        const openEditorsSection = document.createElement('section');
        openEditorsSection.className = 'code-editor-explorer-section';

        const openEditorsTitle = document.createElement('h3');
        openEditorsTitle.className = 'code-editor-explorer-title';
        openEditorsTitle.textContent = 'Open Editors';

        const openEditorsHost = document.createElement('ul');
        openEditorsHost.className = 'code-editor-open-editors';

        openEditorsSection.append(openEditorsTitle, openEditorsHost);

        const folderSection = document.createElement('section');
        folderSection.className = 'code-editor-explorer-section';

        const folderTitle = document.createElement('h3');
        folderTitle.className = 'code-editor-explorer-title';
        folderTitle.textContent = 'Folder';

        const folderTreeHost = document.createElement('div');
        folderTreeHost.className = 'code-editor-folder-tree';
        folderTreeHost.setAttribute('role', 'tree');
        folderTreeHost.setAttribute('aria-label', 'Workspace files');

        folderSection.append(folderTitle, folderTreeHost);
        explorer.append(openEditorsSection, folderSection);

        const editorHost = document.createElement('div');
        editorHost.className = 'code-editor-surface';
        editorHost.setAttribute('role', 'region');
        editorHost.setAttribute('aria-label', 'Code editor');

        workspace.append(explorer, editorHost);

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.className = 'code-editor-file-input';
        fileInput.setAttribute('aria-hidden', 'true');
        fileInput.tabIndex = -1;

        const status = document.createElement('div');
        status.className = 'code-editor-status';
        status.textContent = 'Loading Monaco...';

        root.append(header, workspace, status, fileInput);
        container.append(root);

        this.editorHost = editorHost;
        this.tabsHost = tabsHost;
        this.openEditorsHost = openEditorsHost;
        this.folderTreeHost = folderTreeHost;
        this.statusNode = status;
        this.newFileButton = newFileButton;
        this.saveFileButton = saveFileButton;
        this.importFileButton = importFileButton;
        this.fileInput = fileInput;
        this.element = container;
        this.expandedFolders.add(this.getEffectiveExplorerRootPath());

        this.newFileButton.addEventListener('click', () => {
            this.createDocument();
        });
        this.saveFileButton.addEventListener('click', () => {
            this.saveActiveDocumentToVfs();
        });
        this.importFileButton.addEventListener('click', () => {
            this.fileInput?.click();
        });
        this.fileInput.addEventListener('change', event => {
            this.handleLocalFileImport(event);
        });

        this.renderExplorer();
        this.bindVirtualFsSync();

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

    private getEffectiveExplorerRootPath(): string {
        if (VirtualFS.getFolder(this.explorerRootPath)) return this.explorerRootPath;
        return '/';
    }

    private getBasename(path: string): string {
        const cleaned = path.replace(/\/$/, '');
        const parts = cleaned.split('/').filter(Boolean);
        return parts[parts.length - 1] || '/';
    }

    private getDirname(path: string): string {
        const parts = path.split('/').filter(Boolean);
        if (parts.length <= 1) return '/';
        return `/${parts.slice(0, -1).join('/')}`;
    }

    private joinPath(parent: string, name: string): string {
        if (parent === '/') return `/${name}`;
        return `${parent}/${name}`;
    }

    private ensureFolderPath(path: string): void {
        if (path === '/' || VirtualFS.getFolder(path)) return;
        const parts = path.split('/').filter(Boolean);
        let current = '';
        for (const part of parts) {
            current += `/${part}`;
            if (!VirtualFS.getFolder(current)) {
                VirtualFS.createFolder(current);
            }
        }
    }

    private getActiveDoc(): EditorDoc | null {
        if (!this.activeDocId) return null;
        return this.docs.get(this.activeDocId) || null;
    }

    private renderExplorer(): void {
        this.renderOpenEditors();
        this.renderFolderTree();
    }

    private renderOpenEditors(): void {
        if (!this.openEditorsHost) return;
        this.openEditorsHost.innerHTML = '';

        this.docs.forEach(doc => {
            const item = document.createElement('li');
            item.className = `code-editor-open-item ${doc.id === this.activeDocId ? 'is-active' : ''}`;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'code-editor-open-item-button';
            button.textContent = doc.isDirty ? `${doc.filename} *` : doc.filename;
            button.setAttribute('aria-current', doc.id === this.activeDocId ? 'true' : 'false');
            button.addEventListener('click', () => {
                this.activateDocument(doc.id);
            });

            const meta = document.createElement('span');
            meta.className = 'code-editor-open-item-meta';
            meta.textContent = doc.vfsPath || 'not saved';

            item.append(button, meta);
            this.openEditorsHost?.appendChild(item);
        });
    }

    private renderFolderTree(): void {
        if (!this.folderTreeHost) return;

        const rootPath = this.getEffectiveExplorerRootPath();
        const rootName = this.getBasename(rootPath);
        const rootChildren = VirtualFS.list(rootPath);
        this.folderTreeHost.innerHTML = '';

        const rootNode = document.createElement('div');
        rootNode.className = 'code-editor-tree-root';

        const rootButton = document.createElement('button');
        rootButton.type = 'button';
        rootButton.className = 'code-editor-tree-folder';
        rootButton.textContent = `▾ ${rootName}`;
        rootButton.setAttribute('aria-expanded', 'true');

        const childrenHost = document.createElement('div');
        childrenHost.className = 'code-editor-tree-children';

        rootNode.append(rootButton, childrenHost);
        this.folderTreeHost.appendChild(rootNode);

        this.renderFolderChildren(childrenHost, rootPath, rootChildren, 0);
    }

    private renderFolderChildren(
        host: HTMLElement,
        basePath: string,
        children: Record<string, { type: string }>,
        depth: number
    ): void {
        const entries = Object.entries(children).sort((a, b) => {
            const aType = a[1]?.type;
            const bType = b[1]?.type;
            if (aType !== bType) return aType === 'folder' ? -1 : 1;
            return a[0].localeCompare(b[0]);
        });

        for (const [name, item] of entries) {
            const fullPath = this.joinPath(basePath, name);
            if (item.type === 'folder') {
                const folderNode = document.createElement('div');
                folderNode.className = 'code-editor-tree-node';

                const folderButton = document.createElement('button');
                folderButton.type = 'button';
                folderButton.className = 'code-editor-tree-folder';
                folderButton.style.paddingLeft = `${12 + depth * 16}px`;
                const isExpanded = this.expandedFolders.has(fullPath);
                folderButton.textContent = `${isExpanded ? '▾' : '▸'} ${name}`;
                folderButton.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
                folderButton.addEventListener('click', () => {
                    if (this.expandedFolders.has(fullPath)) this.expandedFolders.delete(fullPath);
                    else this.expandedFolders.add(fullPath);
                    this.renderFolderTree();
                });

                folderNode.appendChild(folderButton);

                if (isExpanded) {
                    const nested = document.createElement('div');
                    nested.className = 'code-editor-tree-children';
                    this.renderFolderChildren(
                        nested,
                        fullPath,
                        VirtualFS.list(fullPath),
                        depth + 1
                    );
                    folderNode.appendChild(nested);
                }

                host.appendChild(folderNode);
                continue;
            }

            const fileButton = document.createElement('button');
            fileButton.type = 'button';
            fileButton.className = `code-editor-tree-file ${this.getActiveDoc()?.vfsPath === fullPath ? 'is-active' : ''}`;
            fileButton.style.paddingLeft = `${28 + depth * 16}px`;
            fileButton.textContent = name;
            fileButton.setAttribute('role', 'treeitem');
            fileButton.addEventListener('click', () => {
                this.openFileFromVirtualFs(fullPath);
            });
            host.appendChild(fileButton);
        }
    }

    private openFileFromVirtualFs(path: string): void {
        const content = VirtualFS.readFile(path);
        if (content === null) {
            this.setStatus(`Could not open ${path}`);
            return;
        }

        this.openDocument(this.getBasename(path), content, { vfsPath: path });
        this.setStatus(`Opened ${path}`);
    }

    private saveActiveDocumentToVfs(): void {
        const activeDoc = this.getActiveDoc();
        if (!activeDoc) return;

        const content = activeDoc.model.getValue?.() ?? '';
        const rootPath = this.getEffectiveExplorerRootPath();
        const targetPath = activeDoc.vfsPath || this.joinPath(rootPath, activeDoc.filename);

        this.ensureFolderPath(this.getDirname(targetPath));

        if (VirtualFS.getFile(targetPath)) {
            VirtualFS.writeFile(targetPath, content);
        } else {
            const created = VirtualFS.createFile(targetPath, content);
            if (!created) {
                this.setStatus(`Could not save ${targetPath}`);
                return;
            }
        }

        activeDoc.vfsPath = targetPath;
        activeDoc.filename = this.getBasename(targetPath);
        activeDoc.savedVersionId = Number(activeDoc.model.getAlternativeVersionId?.() || 0);
        activeDoc.isDirty = false;

        this.renderFileTabs();
        this.renderExplorer();
        this.setStatus(`Saved ${targetPath}`);
    }

    private handleLocalFileImport(event: Event): void {
        const target = event.target as HTMLInputElement;
        const file = target?.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = loadEvent => {
            const content = (loadEvent.target as FileReader)?.result;
            if (typeof content !== 'string') return;
            this.openDocument(file.name, content, { vfsPath: null });
            this.setStatus(`Imported ${file.name}`);
        };
        reader.onerror = () => {
            this.setStatus(`Import failed for ${file.name}`);
        };
        reader.readAsText(file);
        target.value = '';
    }

    private bindVirtualFsSync(): void {
        if (this.vfsListener) return;

        this.vfsListener = event => {
            const doc = this.getActiveDoc();
            if (
                doc?.vfsPath &&
                event.path === doc.vfsPath &&
                event.type === 'update' &&
                !doc.isDirty
            ) {
                const fresh = VirtualFS.readFile(doc.vfsPath);
                if (typeof fresh === 'string') {
                    doc.model.setValue(fresh);
                    doc.savedVersionId = Number(doc.model.getAlternativeVersionId?.() || 0);
                    doc.isDirty = false;
                }
            }

            this.renderFolderTree();
            this.renderOpenEditors();
        };

        VirtualFS.addEventListener(this.vfsListener);
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
                        vfsPath: null,
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

        this.renderOpenEditors();
    }

    createDocument(options?: {
        filename?: string;
        content?: string;
        vfsPath?: string | null;
    }): string | null {
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
            vfsPath: options?.vfsPath || null,
            model,
            viewState: null,
            isDirty: false,
            savedVersionId,
        };

        this.docs.set(doc.id, doc);
        this.activateDocument(doc.id);
        return doc.id;
    }

    openDocument(
        filename: string,
        content: string,
        options?: { vfsPath?: string | null }
    ): string | null {
        if (!this.monaco) {
            this.runWhenReady(() => {
                this.openDocument(filename, content);
            });
            return null;
        }

        const existing = Array.from(this.docs.values()).find(doc => {
            if (options?.vfsPath && doc.vfsPath) return doc.vfsPath === options.vfsPath;
            return doc.filename === filename;
        });
        if (existing) {
            existing.model.setValue(content);
            existing.savedVersionId = Number(existing.model.getAlternativeVersionId?.() || 0);
            existing.isDirty = false;
            existing.vfsPath = options?.vfsPath || existing.vfsPath;
            this.activateDocument(existing.id);
            return existing.id;
        }

        return this.createDocument({ filename, content, vfsPath: options?.vfsPath || null });
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
        this.renderFolderTree();
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

        this.renderExplorer();
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

        if (this.vfsListener) {
            VirtualFS.removeEventListener(this.vfsListener);
            this.vfsListener = null;
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
