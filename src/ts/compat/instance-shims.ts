import logger from '../core/logger.js';
/**
 * Compatibility shim factory for legacy InstanceManager APIs.
 * Bridges old window.*InstanceManager callers to new multi-window/tab architecture.
 */

export type ShimOptions = {
    legacyName:
        | 'FinderInstanceManager'
        | 'TerminalInstanceManager'
        | 'TextEditorInstanceManager'
        | string;
    registryType: string;
    createInstance: (opts?: {
        title?: string;
    }) => { instanceId: string; type: string; title?: string } | null;
    getInstanceCount: () => number;
    getAllInstances: () => Array<{
        instanceId: string;
        type: string;
        title?: string;
        show?: () => void;
        hide?: () => void;
    }>;
    getActiveInstance: () => { instanceId: string; type: string; title?: string } | null;
    setActiveInstance: (id: string) => void;
};

type FinderCompatViewMode = 'list' | 'grid' | 'columns' | 'gallery';
type FinderCompatCurrentView = 'computer' | 'github' | 'favorites' | 'recent';
type FinderCompatSortField = 'name' | 'date' | 'size' | 'type';

type FinderCompatView = {
    currentPath?: string[];
    source?: FinderCompatCurrentView;
    viewMode?: 'list' | 'grid';
    goRoot?: () => void;
    navigateUp?: () => void;
    navigateToFolder?: (folderName: string) => void;
    navigateToPath?: (parts: string[]) => void;
    openGithubProjects?: () => void;
    openItem?: (name: string, type: string) => Promise<void>;
    setSortBy?: (key: string) => void;
    setViewMode?: (mode: string) => void;
    toggleFavorite?: (path: string) => void;
};

export type FinderCompatShimOptions = {
    getActiveView: () => FinderCompatView | null;
    ensureActiveView: () => FinderCompatView | null;
    openFinder: () => void;
    closeFinder: () => void;
};

export function installShim(opts: ShimOptions, win: Window & typeof globalThis): void {
    const globalBag = win as unknown as Window & Record<string, unknown>;
    if (typeof globalBag[opts.legacyName] !== 'undefined') return; // already exists
    try {
        globalBag[opts.legacyName] = {
            createInstance: opts.createInstance,
            getInstanceCount: opts.getInstanceCount,
            getAllInstances: opts.getAllInstances,
            getActiveInstance: opts.getActiveInstance,
            setActiveInstance: opts.setActiveInstance,
        };
        logger.info('APP', `[COMPAT] ${opts.legacyName} shim installed`);
    } catch (err) {
        logger.warn('APP', `[COMPAT] ${opts.legacyName} shim failed:`, err);
    }
}

export function installFinderCompatShim(
    opts: FinderCompatShimOptions,
    win: Window & typeof globalThis
): void {
    const globalBag = win as unknown as Window & Record<string, unknown>;
    if (typeof globalBag.FinderSystem !== 'undefined') return;

    try {
        globalBag.FinderSystem = {
            init(): void {},
            openFinder(): void {
                opts.openFinder();
            },
            closeFinder(): void {
                opts.closeFinder();
            },
            navigateTo(path: string[] | string, view?: FinderCompatCurrentView | null): void {
                const finderView = opts.ensureActiveView();
                if (!finderView) return;

                if (view === 'github') {
                    if (typeof finderView.openGithubProjects === 'function') {
                        finderView.openGithubProjects();
                    } else {
                        finderView.source = 'github';
                        finderView.setViewMode?.('gallery');
                        finderView.goRoot?.();
                    }
                    return;
                }

                finderView.source = 'computer';
                const parts = Array.isArray(path)
                    ? path
                    : path
                      ? String(path).split('/').filter(Boolean)
                      : [];
                finderView.navigateToPath?.(parts);
            },
            navigateUp(): void {
                opts.getActiveView()?.navigateUp?.();
            },
            navigateToFolder(folderName: string): void {
                opts.getActiveView()?.navigateToFolder?.(folderName);
            },
            openItem(name: string, type: string): void {
                void opts.getActiveView()?.openItem?.(name, type);
            },
            setSortBy(field: FinderCompatSortField): void {
                const keyMap: Record<FinderCompatSortField, string> = {
                    name: 'name',
                    date: 'dateModified',
                    size: 'size',
                    type: 'type',
                };
                opts.getActiveView()?.setSortBy?.(keyMap[field]);
            },
            setViewMode(mode: FinderCompatViewMode): void {
                const normalizedMode = mode === 'columns' ? 'list' : mode;
                opts.getActiveView()?.setViewMode?.(normalizedMode);
            },
            toggleFavorite(path: string): void {
                opts.getActiveView()?.toggleFavorite?.(path);
            },
            getState(): {
                currentPath: string[];
                currentView?: FinderCompatCurrentView;
                viewMode?: 'list' | 'grid';
            } | null {
                const finderView = opts.getActiveView();
                if (!finderView) return null;

                return {
                    currentPath: finderView.currentPath ?? [],
                    currentView: finderView.source,
                    viewMode: finderView.viewMode,
                };
            },
        };
        logger.info('APP', '[COMPAT] FinderSystem shim installed');
    } catch (err) {
        logger.warn('APP', '[COMPAT] FinderSystem shim failed:', err);
    }
}
