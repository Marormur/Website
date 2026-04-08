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
    getAction?: (id: string) => { run: () => Promise<void> } | null;
    trigger?: (source: string, handlerId: string, payload?: unknown) => void;
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

type FolderSearchResult = {
    path: string;
    fileName: string;
    matchType: 'name' | 'content';
    preview: string;
};

type SerializedWorkbenchDoc = {
    filename: string;
    language: string;
    vfsPath: string | null;
    content: string;
    isDirty: boolean;
};

type WorkbenchContentState = {
    docs?: SerializedWorkbenchDoc[];
    activeDocPath?: string | null;
    activeDocFilename?: string;
    untitledCounter?: number;
};

type I18nParams = Record<string, string | number>;

type AppI18nBridge = {
    translate?: (
        key: string,
        paramsOrFallback?: I18nParams | string,
        options?: { fallback?: string }
    ) => string;
    applyTranslations?: (root?: Document | Element) => void;
    getActiveLanguage?: () => string;
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

function resolveMonacoLocale(): 'de' | 'en' {
    const i18n = (window as Window & { appI18n?: AppI18nBridge }).appI18n;
    const activeLanguage = i18n?.getActiveLanguage?.() || document.documentElement.lang || 'en';
    return activeLanguage.toLowerCase().startsWith('de') ? 'de' : 'en';
}

function ensureMonacoWorkersConfigured(): void {
    if (monacoWorkersConfigured) return;

    const monacoEnvironment = {
        getWorker: (_workerId: string, label: string) => {
            const workerPath =
                label === 'json'
                    ? './js/monaco-workers/json.worker.js'
                    : './js/monaco-workers/editor.worker.js';
            return new Worker(workerPath);
        },
        locale: resolveMonacoLocale(),
    } as Window['MonacoEnvironment'] & { locale?: string };

    window.MonacoEnvironment = monacoEnvironment;
    monacoWorkersConfigured = true;
}

function resolveMonacoTheme(): 'vs' | 'vs-dark' {
    const themePreference = window.ThemeSystem?.getThemePreference?.();
    if (themePreference === 'dark') return 'vs-dark';
    if (themePreference === 'light') return 'vs';
    if (themePreference === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs';
    }

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

export class CodeEditorWorkbenchTab extends BaseTab {
    private editor: MonacoStandaloneEditor | null = null;
    private monaco: MonacoModule | null = null;
    private editorHost: HTMLDivElement | null = null;
    private tabsHost: HTMLDivElement | null = null;
    private openEditorsHost: HTMLUListElement | null = null;
    private folderTreeHost: HTMLDivElement | null = null;
    private folderSearchInput: HTMLInputElement | null = null;
    private folderSearchButton: HTMLButtonElement | null = null;
    private inFileSearchButton: HTMLButtonElement | null = null;
    private folderSearchResultsHost: HTMLUListElement | null = null;
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
    private readonly keydownListener = (event: KeyboardEvent) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
            event.preventDefault();
            this.openInFileSearch();
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'g') {
            event.preventDefault();
            this.openGoToLine();
        }
    };
    private readonly languagePreferenceListener = () => {
        const monacoEnvironment = window.MonacoEnvironment as
            | (Window['MonacoEnvironment'] & { locale?: string })
            | undefined;
        if (monacoEnvironment) {
            monacoEnvironment.locale = resolveMonacoLocale();
        }
        this.applyTranslations();
        this.renderExplorer();
        this.renderFileTabs();
    };
    private expandedFolders = new Set<string>();
    private readonly explorerRootPath = '/home/marvin';
    private folderSearchResults: FolderSearchResult[] = [];
    private isRestoringState = false;
    private pendingRestoreState: WorkbenchContentState | null = null;

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
            title:
                config?.title ||
                window.appI18n?.translate?.('programs.codeEditor.label', 'Code Editor') ||
                'Code Editor',
            ...config,
        });

        const state = this.contentState as WorkbenchContentState;
        if (state && typeof state === 'object') {
            this.pendingRestoreState = state;
            if (
                typeof state.untitledCounter === 'number' &&
                Number.isFinite(state.untitledCounter)
            ) {
                this.untitledCounter = Math.max(1, Math.floor(state.untitledCounter));
            }
        }
    }

    private persistWorkbenchState(): void {
        if (this.isRestoringState) return;

        const docs = Array.from(this.docs.values()).map(doc => ({
            filename: doc.filename,
            language: doc.language,
            vfsPath: doc.vfsPath,
            content: doc.model.getValue?.() || '',
            isDirty: doc.isDirty,
        }));

        const activeDoc = this.getActiveDoc();

        this.updateContentState({
            docs,
            activeDocPath: activeDoc?.vfsPath || null,
            activeDocFilename: activeDoc?.filename || null,
            untitledCounter: this.untitledCounter,
        });
    }

    private restoreFromPersistedState(): boolean {
        if (!this.pendingRestoreState || !this.monaco) return false;

        const docs = Array.isArray(this.pendingRestoreState.docs)
            ? this.pendingRestoreState.docs
            : [];
        if (docs.length === 0) return false;

        this.isRestoringState = true;
        try {
            docs.forEach(savedDoc => {
                const docId = this.createDocument({
                    filename: savedDoc.filename,
                    content: savedDoc.content,
                    vfsPath: savedDoc.vfsPath,
                });
                if (!docId) return;
                const doc = this.docs.get(docId);
                if (!doc) return;

                doc.language = savedDoc.language || doc.language;
                doc.savedVersionId = Number(doc.model.getAlternativeVersionId?.() || 0);
                doc.isDirty = !!savedDoc.isDirty;
            });

            const activeByPath = this.pendingRestoreState.activeDocPath
                ? Array.from(this.docs.values()).find(
                      doc => doc.vfsPath === this.pendingRestoreState?.activeDocPath
                  )
                : null;
            const activeByFilename =
                !activeByPath && this.pendingRestoreState.activeDocFilename
                    ? Array.from(this.docs.values()).find(
                          doc => doc.filename === this.pendingRestoreState?.activeDocFilename
                      )
                    : null;
            const fallback = Array.from(this.docs.values())[0] || null;

            const targetActive = activeByPath || activeByFilename || fallback;
            if (targetActive) {
                this.activateDocument(targetActive.id);
            }
            this.renderExplorer();
            return true;
        } finally {
            this.isRestoringState = false;
            this.pendingRestoreState = null;
        }
    }

    override serialize() {
        this.persistWorkbenchState();
        return super.serialize();
    }

    static deserialize(state: Record<string, unknown>): CodeEditorWorkbenchTab {
        const tab = new CodeEditorWorkbenchTab({
            id: (state.id as string | undefined) || undefined,
            title:
                (state.title as string | undefined) ||
                window.appI18n?.translate?.('programs.codeEditor.label', 'Code Editor') ||
                'Code Editor',
            content: (state.contentState as WorkbenchContentState | undefined) || {},
            metadata: {
                created: (state.created as number | undefined) || Date.now(),
                modified: (state.modified as number | undefined) || Date.now(),
            },
        });
        return tab;
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
        tabsHost.setAttribute('aria-label', this.t('codeEditor.aria.openFiles', 'Open files'));
        tabsHost.setAttribute('data-i18n-aria-label', 'codeEditor.aria.openFiles');

        const newFileButton = document.createElement('button');
        newFileButton.type = 'button';
        newFileButton.className = 'code-editor-new-file';
        newFileButton.textContent = this.t('codeEditor.actions.newFile', 'New File');
        newFileButton.setAttribute('data-i18n', 'codeEditor.actions.newFile');
        newFileButton.setAttribute(
            'aria-label',
            this.t('codeEditor.aria.createFileTab', 'Create a new file tab')
        );
        newFileButton.setAttribute('data-i18n-aria-label', 'codeEditor.aria.createFileTab');

        const saveFileButton = document.createElement('button');
        saveFileButton.type = 'button';
        saveFileButton.className = 'code-editor-header-action';
        saveFileButton.textContent = this.t('codeEditor.actions.save', 'Save');
        saveFileButton.setAttribute('data-i18n', 'codeEditor.actions.save');
        saveFileButton.setAttribute(
            'aria-label',
            this.t('codeEditor.aria.saveActiveFile', 'Save active file to workspace')
        );
        saveFileButton.setAttribute('data-i18n-aria-label', 'codeEditor.aria.saveActiveFile');

        const importFileButton = document.createElement('button');
        importFileButton.type = 'button';
        importFileButton.className = 'code-editor-header-action';
        importFileButton.textContent = this.t('codeEditor.actions.import', 'Import');
        importFileButton.setAttribute('data-i18n', 'codeEditor.actions.import');
        importFileButton.setAttribute(
            'aria-label',
            this.t('codeEditor.aria.importLocalFile', 'Import local file')
        );
        importFileButton.setAttribute('data-i18n-aria-label', 'codeEditor.aria.importLocalFile');

        header.append(tabsHost, newFileButton, saveFileButton, importFileButton);

        const workspace = document.createElement('div');
        workspace.className = 'code-editor-workspace';

        const explorer = document.createElement('aside');
        explorer.className = 'code-editor-explorer';
        explorer.setAttribute('aria-label', this.t('codeEditor.aria.explorer', 'Explorer'));
        explorer.setAttribute('data-i18n-aria-label', 'codeEditor.aria.explorer');

        const searchSection = document.createElement('section');
        searchSection.className = 'code-editor-explorer-section';

        const searchTitle = document.createElement('h3');
        searchTitle.className = 'code-editor-explorer-title';
        searchTitle.textContent = this.t('codeEditor.sections.search', 'Search');
        searchTitle.setAttribute('data-i18n', 'codeEditor.sections.search');

        const searchControls = document.createElement('div');
        searchControls.className = 'code-editor-search-controls';

        const folderSearchInput = document.createElement('input');
        folderSearchInput.type = 'search';
        folderSearchInput.className = 'code-editor-search-input';
        folderSearchInput.placeholder = this.t(
            'codeEditor.search.folderPlaceholder',
            'Search in folder'
        );
        folderSearchInput.setAttribute(
            'data-i18n-placeholder',
            'codeEditor.search.folderPlaceholder'
        );
        folderSearchInput.setAttribute(
            'aria-label',
            this.t('codeEditor.aria.searchWorkspaceFolder', 'Search in workspace folder')
        );
        folderSearchInput.setAttribute(
            'data-i18n-aria-label',
            'codeEditor.aria.searchWorkspaceFolder'
        );

        const folderSearchButton = document.createElement('button');
        folderSearchButton.type = 'button';
        folderSearchButton.className = 'code-editor-search-button';
        folderSearchButton.textContent = this.t('codeEditor.actions.find', 'Find');
        folderSearchButton.setAttribute('data-i18n', 'codeEditor.actions.find');
        folderSearchButton.setAttribute(
            'aria-label',
            this.t('codeEditor.aria.startFolderSearch', 'Start folder search')
        );
        folderSearchButton.setAttribute(
            'data-i18n-aria-label',
            'codeEditor.aria.startFolderSearch'
        );

        const inFileSearchButton = document.createElement('button');
        inFileSearchButton.type = 'button';
        inFileSearchButton.className = 'code-editor-search-button';
        inFileSearchButton.textContent = this.t('codeEditor.actions.inFile', 'In File');
        inFileSearchButton.setAttribute('data-i18n', 'codeEditor.actions.inFile');
        inFileSearchButton.setAttribute(
            'aria-label',
            this.t('codeEditor.aria.openInFileSearch', 'Open in-file search')
        );
        inFileSearchButton.setAttribute('data-i18n-aria-label', 'codeEditor.aria.openInFileSearch');

        searchControls.append(folderSearchInput, folderSearchButton, inFileSearchButton);

        const folderSearchResults = document.createElement('ul');
        folderSearchResults.className = 'code-editor-search-results';
        folderSearchResults.setAttribute(
            'aria-label',
            this.t('codeEditor.aria.folderSearchResults', 'Folder search results')
        );
        folderSearchResults.setAttribute(
            'data-i18n-aria-label',
            'codeEditor.aria.folderSearchResults'
        );

        searchSection.append(searchTitle, searchControls, folderSearchResults);

        const openEditorsSection = document.createElement('section');
        openEditorsSection.className = 'code-editor-explorer-section';

        const openEditorsTitle = document.createElement('h3');
        openEditorsTitle.className = 'code-editor-explorer-title';
        openEditorsTitle.textContent = this.t('codeEditor.sections.openEditors', 'Open Editors');
        openEditorsTitle.setAttribute('data-i18n', 'codeEditor.sections.openEditors');

        const openEditorsHost = document.createElement('ul');
        openEditorsHost.className = 'code-editor-open-editors';

        openEditorsSection.append(openEditorsTitle, openEditorsHost);

        const folderSection = document.createElement('section');
        folderSection.className = 'code-editor-explorer-section';

        const folderTitle = document.createElement('h3');
        folderTitle.className = 'code-editor-explorer-title';
        folderTitle.textContent = this.t('codeEditor.sections.folder', 'Folder');
        folderTitle.setAttribute('data-i18n', 'codeEditor.sections.folder');

        const folderTreeHost = document.createElement('div');
        folderTreeHost.className = 'code-editor-folder-tree';
        folderTreeHost.setAttribute('role', 'tree');
        folderTreeHost.setAttribute(
            'aria-label',
            this.t('codeEditor.aria.workspaceFiles', 'Workspace files')
        );
        folderTreeHost.setAttribute('data-i18n-aria-label', 'codeEditor.aria.workspaceFiles');

        folderSection.append(folderTitle, folderTreeHost);
        explorer.append(searchSection, openEditorsSection, folderSection);

        const editorHost = document.createElement('div');
        editorHost.className = 'code-editor-surface';
        editorHost.setAttribute('role', 'region');
        editorHost.setAttribute(
            'aria-label',
            this.t('codeEditor.aria.editorSurface', 'Code editor')
        );
        editorHost.setAttribute('data-i18n-aria-label', 'codeEditor.aria.editorSurface');

        workspace.append(explorer, editorHost);

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.className = 'code-editor-file-input';
        fileInput.setAttribute('aria-hidden', 'true');
        fileInput.tabIndex = -1;

        const status = document.createElement('div');
        status.className = 'code-editor-status';
        status.textContent = this.t('codeEditor.status.loadingMonaco', 'Loading Monaco...');

        root.append(header, workspace, status, fileInput);
        container.append(root);

        this.editorHost = editorHost;
        this.tabsHost = tabsHost;
        this.openEditorsHost = openEditorsHost;
        this.folderTreeHost = folderTreeHost;
        this.folderSearchInput = folderSearchInput;
        this.folderSearchButton = folderSearchButton;
        this.inFileSearchButton = inFileSearchButton;
        this.folderSearchResultsHost = folderSearchResults;
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
        this.folderSearchButton.addEventListener('click', () => {
            this.executeFolderSearch();
        });
        this.inFileSearchButton.addEventListener('click', () => {
            this.openInFileSearch();
        });
        this.folderSearchInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.executeFolderSearch();
            }
        });
        container.addEventListener('keydown', this.keydownListener);
        window.addEventListener('languagePreferenceChange', this.languagePreferenceListener);

        this.applyTranslations();
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

    private t(key: string, fallback: string, params: I18nParams = {}): string {
        const i18n = (window as Window & { appI18n?: AppI18nBridge }).appI18n;
        return i18n?.translate?.(key, params, { fallback }) || fallback;
    }

    private applyTranslations(): void {
        const i18n = (window as Window & { appI18n?: AppI18nBridge }).appI18n;
        if (this.element instanceof HTMLElement) {
            i18n?.applyTranslations?.(this.element);
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
        this.renderFolderSearchResults();
        this.renderOpenEditors();
        this.renderFolderTree();
    }

    private renderFolderSearchResults(): void {
        if (!this.folderSearchResultsHost) return;
        this.folderSearchResultsHost.innerHTML = '';

        this.folderSearchResults.slice(0, 25).forEach(result => {
            const item = document.createElement('li');
            item.className = 'code-editor-search-result-item';

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'code-editor-search-result-button';
            const localizedMatchType = this.t(
                `codeEditor.search.matchType.${result.matchType}`,
                result.matchType
            );
            button.textContent = `${result.fileName} · ${localizedMatchType}`;
            button.setAttribute(
                'aria-label',
                this.t('codeEditor.search.openResultAria', 'Open search result {path}', {
                    path: result.path,
                })
            );
            button.addEventListener('click', () => {
                this.openFileFromVirtualFs(result.path);
                if (this.folderSearchInput?.value) {
                    this.openInFileSearch(this.folderSearchInput.value);
                }
            });

            const meta = document.createElement('span');
            meta.className = 'code-editor-search-result-meta';
            meta.textContent = `${result.path} · ${result.preview}`;

            item.append(button, meta);
            this.folderSearchResultsHost?.appendChild(item);
        });
    }

    private collectFilesFromFolder(path: string): string[] {
        const entries = VirtualFS.list(path);
        const files: string[] = [];

        Object.entries(entries).forEach(([name, item]) => {
            const fullPath = this.joinPath(path, name);
            if (item.type === 'folder') {
                files.push(...this.collectFilesFromFolder(fullPath));
                return;
            }
            files.push(fullPath);
        });

        return files;
    }

    private executeFolderSearch(): void {
        const query = this.folderSearchInput?.value?.trim() || '';
        if (!query) {
            this.folderSearchResults = [];
            this.renderFolderSearchResults();
            this.setStatus(
                this.t('codeEditor.status.folderSearchCleared', 'Folder search cleared')
            );
            return;
        }

        const rootPath = this.getEffectiveExplorerRootPath();
        const queryLower = query.toLowerCase();
        const files = this.collectFilesFromFolder(rootPath);

        this.folderSearchResults = files
            .map(path => {
                const fileName = this.getBasename(path);
                const content = VirtualFS.readFile(path) || '';
                const nameMatch = fileName.toLowerCase().includes(queryLower);
                const contentIdx = content.toLowerCase().indexOf(queryLower);
                if (!nameMatch && contentIdx < 0) return null;

                const preview =
                    contentIdx >= 0
                        ? content
                              .slice(Math.max(0, contentIdx - 25), contentIdx + query.length + 45)
                              .replace(/\s+/g, ' ')
                              .trim()
                        : fileName;

                return {
                    path,
                    fileName,
                    matchType: nameMatch ? 'name' : 'content',
                    preview: preview || fileName,
                } as FolderSearchResult;
            })
            .filter((entry): entry is FolderSearchResult => !!entry);

        this.renderFolderSearchResults();
        this.setStatus(
            this.t('codeEditor.status.folderSearchResults', 'Folder search: {count} result(s)', {
                count: this.folderSearchResults.length,
            })
        );
    }

    private openInFileSearch(searchString?: string): void {
        if (!this.editor) return;

        const query = searchString ?? (this.folderSearchInput?.value?.trim() || '');

        const findAction = this.editor.getAction?.('actions.find');
        if (findAction) {
            void findAction.run();
            if (query) {
                this.setStatus(
                    this.t(
                        'codeEditor.status.inFileSearchOpenedForQuery',
                        'In-file search opened for: {query}',
                        { query }
                    )
                );
            }
            return;
        }

        this.editor.trigger?.('keyboard', 'actions.find', undefined);
    }

    private openGoToLine(): void {
        if (!this.editor) return;

        const action = this.editor.getAction?.('editor.action.gotoLine');
        if (action) {
            void action.run();
            this.setStatus(this.t('codeEditor.status.goToLineOpened', 'Go to line opened'));
            return;
        }

        this.editor.trigger?.('keyboard', 'editor.action.gotoLine', undefined);
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
            meta.textContent = doc.vfsPath || this.t('codeEditor.meta.notSaved', 'not saved');

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
            this.setStatus(
                this.t('codeEditor.status.couldNotOpenPath', 'Could not open {path}', { path })
            );
            return;
        }

        this.openDocument(this.getBasename(path), content, { vfsPath: path });
        this.setStatus(this.t('codeEditor.status.openedPath', 'Opened {path}', { path }));
    }

    /** Saves the currently active document to VirtualFS. Used by the menu bar. */
    saveDocument(): void {
        this.saveActiveDocumentToVfs();
    }

    /**
     * Triggers a Monaco editor action by ID on the active editor (e.g. 'undo', 'redo',
     * 'actions.find'). Used by the menu bar.
     */
    triggerAction(actionId: string): void {
        if (!this.editor) return;
        const action = this.editor.getAction?.(actionId);
        if (action) {
            void action.run();
        } else {
            this.editor.trigger?.('keyboard', actionId, undefined);
        }
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
                this.setStatus(
                    this.t('codeEditor.status.couldNotSavePath', 'Could not save {path}', {
                        path: targetPath,
                    })
                );
                return;
            }
        }

        activeDoc.vfsPath = targetPath;
        activeDoc.filename = this.getBasename(targetPath);
        activeDoc.savedVersionId = Number(activeDoc.model.getAlternativeVersionId?.() || 0);
        activeDoc.isDirty = false;

        this.renderFileTabs();
        this.renderExplorer();
        this.setStatus(this.t('codeEditor.status.savedPath', 'Saved {path}', { path: targetPath }));
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
            this.setStatus(
                this.t('codeEditor.status.importedFile', 'Imported {fileName}', {
                    fileName: file.name,
                })
            );
        };
        reader.onerror = () => {
            this.setStatus(
                this.t('codeEditor.status.importFailedForFile', 'Import failed for {fileName}', {
                    fileName: file.name,
                })
            );
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
            this.renderFolderSearchResults();
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
            this.setStatus(
                this.t('codeEditor.status.initializingMonaco', 'Initializing Monaco...')
            );

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

                const restored = this.restoreFromPersistedState();

                if (!restored && !this.activeDocId) {
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
                this.persistWorkbenchState();
                this.setStatus(this.t('codeEditor.status.ready', 'Code Editor ready'));
            } catch (error) {
                logger.error('CODE_EDITOR', '[Phase1A] Monaco init failed', error);
                this.setStatus(
                    this.t(
                        'codeEditor.status.monacoInitializationFailed',
                        'Monaco initialization failed. Check console output.'
                    )
                );
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
            this.setStatus(
                this.t('codeEditor.status.fileLanguage', '{fileName} · {language}', {
                    fileName: activeDoc.filename,
                    language: activeDoc.language,
                })
            );
            this.persistWorkbenchState();
        }
    }

    private renderFileTabs(): void {
        if (!this.tabsHost) return;

        this.tabsHost.innerHTML = '';
        const tabOrder = Array.from(this.docs.values());

        tabOrder.forEach((doc, index) => {
            const tab = document.createElement('div');
            tab.className = `code-editor-file-tab ${doc.id === this.activeDocId ? 'is-active' : ''}`;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', doc.id === this.activeDocId ? 'true' : 'false');

            const activateButton = document.createElement('button');
            activateButton.type = 'button';
            activateButton.className = 'code-editor-file-tab-label';
            activateButton.textContent = doc.isDirty ? `${doc.filename} *` : doc.filename;
            activateButton.tabIndex = doc.id === this.activeDocId ? 0 : -1;
            activateButton.addEventListener('click', () => this.activateDocument(doc.id));
            activateButton.addEventListener('keydown', event => {
                if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    const next = tabOrder[index + 1] || tabOrder[0];
                    if (next) this.activateDocument(next.id);
                    return;
                }
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    const prev = tabOrder[index - 1] || tabOrder[tabOrder.length - 1];
                    if (prev) this.activateDocument(prev.id);
                    return;
                }
                if (event.key === 'Home') {
                    event.preventDefault();
                    const first = tabOrder[0];
                    if (first) this.activateDocument(first.id);
                    return;
                }
                if (event.key === 'End') {
                    event.preventDefault();
                    const last = tabOrder[tabOrder.length - 1];
                    if (last) this.activateDocument(last.id);
                    return;
                }
                if (event.key === 'Delete' || event.key === 'Backspace') {
                    event.preventDefault();
                    this.closeDocument(doc.id);
                }
            });

            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'code-editor-file-tab-close';
            closeButton.textContent = '×';
            closeButton.setAttribute(
                'aria-label',
                this.t('codeEditor.aria.closeFile', 'Close {fileName}', {
                    fileName: doc.filename,
                })
            );
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
        this.persistWorkbenchState();
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
            this.persistWorkbenchState();
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
        this.setStatus(
            this.t('codeEditor.status.fileLanguage', '{fileName} · {language}', {
                fileName: doc.filename,
                language: doc.language,
            })
        );
        this.renderFolderTree();
        this.persistWorkbenchState();
    }

    closeDocument(docId: string): void {
        const doc = this.docs.get(docId);
        if (!doc) return;

        if (doc.isDirty) {
            const shouldClose = window.confirm(
                this.t(
                    'codeEditor.confirm.closeDirtyTab',
                    'Unsaved changes in {fileName}. Close this tab anyway?',
                    { fileName: doc.filename }
                )
            );
            if (!shouldClose) return;
        }

        const wasActive = this.activeDocId === docId;
        const fallbackDoc = wasActive
            ? Array.from(this.docs.values()).find(candidate => candidate.id !== docId) || null
            : null;

        this.docs.delete(docId);

        if (this.docs.size === 0) {
            this.activeDocId = null;
            this.createDocument();
            doc.model.dispose();
            this.persistWorkbenchState();
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
        this.persistWorkbenchState();
    }

    override destroy(): void {
        const hasDirtyDocs = Array.from(this.docs.values()).some(doc => doc.isDirty);
        if (hasDirtyDocs) {
            const shouldCloseWindow = window.confirm(
                this.t(
                    'codeEditor.confirm.closeDirtyWindow',
                    'Unsaved changes exist. Close the Code Editor window anyway?'
                )
            );
            if (!shouldCloseWindow) return;
        }

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

        this.element?.removeEventListener('keydown', this.keydownListener);
        window.removeEventListener('languagePreferenceChange', this.languagePreferenceListener);

        this.editorInitPromise = null;
        delete (window as unknown as Record<string, unknown>).__MONACO_SPIKE__;

        super.destroy();
    }
}

export class CodeEditorWindow extends BaseWindow {
    constructor(config?: Partial<WindowConfig>) {
        super({
            type: 'code-editor',
            title:
                window.appI18n?.translate?.('programs.codeEditor.label', 'Code Editor') ||
                'Code Editor',
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
        label.textContent =
            window.appI18n?.translate?.('programs.codeEditor.label', 'Code Editor') ||
            'Code Editor';
        tabBar.appendChild(label);
    }

    private getWorkbench(): CodeEditorWorkbenchTab | null {
        return (Array.from(this.tabs.values())[0] as CodeEditorWorkbenchTab | undefined) || null;
    }

    private createWorkbenchIfMissing(): CodeEditorWorkbenchTab {
        const existing = this.getWorkbench();
        if (existing) return existing;

        const workbench = new CodeEditorWorkbenchTab({
            title: window.appI18n?.translate?.('codeEditor.workbenchTitle', 'Editor') || 'Editor',
        });
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

    saveDocument(): void {
        this.createWorkbenchIfMissing().saveDocument();
    }

    triggerAction(actionId: string): void {
        this.createWorkbenchIfMissing().triggerAction(actionId);
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
    save: () => {
        const registry = window['WindowRegistry'];
        const active = registry?.getActiveWindow?.() as CodeEditorWindow | undefined;
        if (active instanceof CodeEditorWindow) {
            active.saveDocument();
        }
    },
    triggerEditorAction: (actionId: string) => {
        const registry = window['WindowRegistry'];
        const active = registry?.getActiveWindow?.() as CodeEditorWindow | undefined;
        if (active instanceof CodeEditorWindow) {
            active.triggerAction(actionId);
        }
    },
};
