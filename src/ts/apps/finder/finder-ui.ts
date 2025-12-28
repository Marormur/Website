import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../../framework/core/component.js';
import { AppShell } from '../../framework/layout/app-shell.js';
import { SplitView } from '../../framework/layout/split-view.js';
import { Sidebar, SidebarGroup } from '../../framework/navigation/sidebar.js';
import { Toolbar } from '../../framework/navigation/toolbar.js';
import { Tabs, TabItem } from '../../framework/navigation/tabs.js';

export interface FinderUIProps {
    id: string;
    windowId: string;
    isActive: boolean;
    source: string;
    currentPath: string[];
    viewMode: 'list' | 'grid';
    sidebarWidth: number;
    searchTerm: string;
    canGoBack: boolean;
    canGoForward: boolean;
    sortBy: string;
    sortOrder: 'asc' | 'desc';

    // Tab properties
    tabs: TabItem[];
    activeTabId: string;
    onTabChange: (id: string) => void;
    onTabClose: (id: string) => void;
    onTabAdd: () => void;
    onTabMove?: (id: string, targetWindowId: string, sourceWindowId?: string) => void;
    onTabDetach?: (id: string, dropPosition?: { x: number; y: number }) => void;

    onNavigateBack: () => void;
    onNavigateForward: () => void;
    onNavigateUp: () => void;
    onGoRoot: () => void;
    onSetViewMode: (mode: 'list' | 'grid') => void;
    onSetSort: (by: 'name' | 'date' | 'size' | 'type') => void;
    onSearch: (term: string) => void;
    onSidebarAction: (action: string) => void;
    onResize: (width: number) => void;
    renderContent: () => VNode;
    renderBreadcrumbs: () => VNode;
}

interface FinderTabDragContext {
    tabId: string;
    windowId: string;
    detach: (pos?: { x: number; y: number }) => void;
}

let activeTabDrag: FinderTabDragContext | null = null;
let globalDragListenersAttached = false;

export class FinderUI extends BaseComponent<FinderUIProps> {
    render(): VNode {
        const {
            id,
            windowId,
            source,
            currentPath,
            viewMode,
            sidebarWidth,
            searchTerm,
            canGoBack,
            canGoForward,
            sortBy,
            sortOrder,
            tabs,
            activeTabId,
            onTabChange,
            onTabClose,
            onTabAdd,
            onNavigateBack,
            onNavigateForward,
            onNavigateUp,
            onGoRoot,
            onSetViewMode,
            onSetSort,
            onSearch,
            onSidebarAction,
            onResize,
            renderContent,
            renderBreadcrumbs,
        } = this.props;

        // Prepare Sidebar Groups
        const sidebarGroups: SidebarGroup[] = [
            {
                label: 'FAVORITEN',
                i18nKey: 'finder.sidebar.favorites',
                items: [
                    {
                        id: 'home',
                        label: 'Home',
                        icon: '🏠',
                        i18nKey: 'finder.sidebar.home',
                        onClick: () => onSidebarAction('home'),
                    },
                    {
                        id: 'computer',
                        label: 'Computer',
                        icon: '💻',
                        i18nKey: 'finder.sidebar.computer',
                        onClick: () => onSidebarAction('computer'),
                    },
                    {
                        id: 'recent',
                        label: 'Zuletzt verwendet',
                        icon: '🕒',
                        i18nKey: 'finder.sidebar.recent',
                        onClick: () => onSidebarAction('recent'),
                    },
                ],
            },
            {
                label: 'ORTE',
                i18nKey: 'finder.sidebar.locations',
                items: [
                    {
                        id: 'github',
                        label: 'GitHub Projekte',
                        icon: '📂',
                        i18nKey: 'finder.sidebar.github',
                        onClick: () => onSidebarAction('github'),
                    },
                    {
                        id: 'starred',
                        label: 'Markiert',
                        icon: '⭐',
                        i18nKey: 'finder.sidebar.starred',
                        onClick: () => onSidebarAction('starred'),
                    },
                ],
            },
        ];

        // Determine active sidebar ID
        let activeSidebarId = source;
        if (source === 'computer') {
            const atHome = currentPath.length > 0 && currentPath[0] === 'home';
            activeSidebarId = atHome ? 'home' : 'computer';
        }

        // Components
        const sidebar = new Sidebar({
            groups: sidebarGroups,
            activeId: activeSidebarId,
            idPrefix: id,
        });

        const toolbar = new Toolbar({
            className: this.props.isActive ? 'finder-toolbar' : 'hidden',
            left: [
                // Navigation buttons - macOS Segmented Control style
                h(
                    'div',
                    {
                        className:
                            'inline-flex items-center rounded-lg bg-gray-200/40 dark:bg-gray-700/40 p-0.5 backdrop-blur-sm border border-gray-300/40 dark:border-gray-600/40 shadow-sm',
                    },
                    // Back button
                    h(
                        'button',
                        {
                            className: `finder-nav-btn transition-all px-3 py-2 rounded-md text-lg font-semibold flex items-center justify-center ${
                                canGoBack
                                    ? 'text-gray-700 dark:text-gray-100 hover:bg-white/60 dark:hover:bg-gray-600/60 active:bg-gray-300/60 dark:active:bg-gray-500/60 cursor-pointer'
                                    : 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-40'
                            } transition-colors duration-150`,
                            onclick: canGoBack ? () => onNavigateBack() : undefined,
                            disabled: !canGoBack,
                            title: 'Zurück (⌘[)',
                            'data-action': 'navigate-back',
                            'aria-label': 'Back',
                        },
                        '‹'
                    ),
                    // Forward button
                    h(
                        'button',
                        {
                            className: `finder-nav-btn transition-all px-3 py-2 rounded-md text-lg font-semibold flex items-center justify-center ${
                                canGoForward
                                    ? 'text-gray-700 dark:text-gray-100 hover:bg-white/60 dark:hover:bg-gray-600/60 active:bg-gray-300/60 dark:active:bg-gray-500/60 cursor-pointer'
                                    : 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-40'
                            } transition-colors duration-150`,
                            onclick: canGoForward ? () => onNavigateForward() : undefined,
                            disabled: !canGoForward,
                            title: 'Vorwärts (⌘])',
                            'data-action': 'navigate-forward',
                            'aria-label': 'Forward',
                        },
                        '›'
                    ),
                    // Separator
                    h('div', {
                        className: 'w-px h-6 bg-gray-300/40 dark:bg-gray-600/40 mx-0.5',
                    }),
                    // Up button
                    h(
                        'button',
                        {
                            className:
                                'finder-nav-btn transition-all px-3 py-2 rounded-md text-lg font-semibold flex items-center justify-center text-gray-700 dark:text-gray-100 hover:bg-white/60 dark:hover:bg-gray-600/60 active:bg-gray-300/60 dark:active:bg-gray-500/60 cursor-pointer transition-colors duration-150',
                            'data-action': 'navigate-up',
                            onclick: () => onNavigateUp(),
                            title: 'Übergeordneter Ordner (⌘↑)',
                            'aria-label': 'Up',
                        },
                        '⬆'
                    )
                ),
            ],
            center: [renderBreadcrumbs()],
            right: [
                h(
                    'div',
                    {
                        className:
                            'flex items-center bg-gray-100 dark:bg-gray-800 rounded-md p-0.5 border border-gray-300 dark:border-gray-600 mr-2',
                    },
                    h(
                        'button',
                        {
                            className: `p-1 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`,
                            onclick: () => onSetViewMode('list'),
                            title: 'Listenansicht',
                            'data-action': 'view-list',
                        },
                        h(
                            'svg',
                            {
                                width: '16',
                                height: '16',
                                viewBox: '0 0 24 24',
                                fill: 'none',
                                stroke: 'currentColor',
                                strokeWidth: '2',
                            },
                            h('path', { d: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' })
                        )
                    ),
                    h(
                        'button',
                        {
                            className: `p-1 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`,
                            onclick: () => onSetViewMode('grid'),
                            title: 'Rasteransicht',
                            'data-action': 'view-grid',
                        },
                        h(
                            'svg',
                            {
                                width: '16',
                                height: '16',
                                viewBox: '0 0 24 24',
                                fill: 'none',
                                stroke: 'currentColor',
                                strokeWidth: '2',
                            },
                            h('rect', { x: '3', y: '3', width: '7', height: '7' }),
                            h('rect', { x: '14', y: '3', width: '7', height: '7' }),
                            h('rect', { x: '14', y: '14', width: '7', height: '7' }),
                            h('rect', { x: '3', y: '14', width: '7', height: '7' })
                        )
                    )
                ),
                h(
                    'div',
                    {
                        className:
                            'flex items-center bg-gray-100 dark:bg-gray-800 rounded-md p-0.5 border border-gray-300 dark:border-gray-600 mr-2',
                    },
                    h(
                        'select',
                        {
                            className:
                                'bg-transparent text-xs px-1 focus:outline-none text-gray-700 dark:text-gray-200',
                            onchange: (e: Event) =>
                                onSetSort((e.target as HTMLSelectElement).value as any),
                            value: sortBy,
                        },
                        h('option', { value: 'name' }, 'Name'),
                        h('option', { value: 'date' }, 'Datum'),
                        h('option', { value: 'size' }, 'Größe'),
                        h('option', { value: 'type' }, 'Art')
                    )
                ),
                h(
                    'div',
                    { className: 'relative' },
                    h('input', {
                        type: 'text',
                        className:
                            'finder-search pl-8 pr-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40',
                        placeholder: 'Suchen',
                        value: searchTerm,
                        oninput: (e: Event) => onSearch((e.target as HTMLInputElement).value),
                    }),
                    h(
                        'svg',
                        {
                            className: 'absolute left-2.5 top-1.5 text-gray-400',
                            width: '14',
                            height: '14',
                            viewBox: '0 0 24 24',
                            fill: 'none',
                            stroke: 'currentColor',
                            strokeWidth: '2',
                        },
                        h('circle', { cx: '11', cy: '11', r: '8' }),
                        h('path', { d: 'M21 21l-4.35-4.35' })
                    )
                ),
            ],
        });

        // Tabs Component (macOS style)
        console.log(
            `[FinderUI] Rendering tab ${id} (active: ${this.props.isActive}) in window ${windowId}`
        );
        // Store tabsComponent on the instance so lifecycle hooks can imperatively
        // manage the container content to avoid duplicate DOM insertions from VDOM
        // reconciliation edge-cases.
        (this as any).tabsComponent = new Tabs({
            tabs,
            activeTabId,
            onTabChange,
            onTabClose,
            onTabAdd,
            showAddButton: true,
            variant: 'macos',
            className: 'bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm',
        });

        const splitView = new SplitView({
            initialSize: sidebarWidth,
            minSize: 150,
            maxSize: 400,
            onResize: width => onResize(width),
            left: h('div', { className: 'split-view-left h-full overflow-auto' }, sidebar.render()),
            right: h(
                'div',
                { className: 'split-view-right flex flex-col h-full overflow-hidden' },
                // Only render Tabs in the active tab's UI to avoid duplicates in the DOM
                // This ensures that E2E tests only find one set of tabs per window
                this.props.isActive
                    ? h('div', {
                          className: 'finder-tabs-container',
                          id: `${windowId}-tabs`,
                          'data-tabs-manual': '1',
                      })
                    : h('div', { className: 'finder-tabs-placeholder hidden' }),
                h('div', { className: 'flex-1 overflow-hidden relative' }, renderContent())
            ),
        });

        const shell = new AppShell({
            toolbar: toolbar.render(),
            content: splitView.render(),
        });

        const vnode = shell.render();
        vnode.props['data-testid'] = 'finder-ui';
        vnode.props['className'] =
            ((vnode.props['className'] as string) || '') + ' finder-vdom-root';

        return vnode;
    }

    onMount(): void {
        // After initial mount, ensure manual tab container is populated if active
        try {
            const winId = this.props.windowId;
            const container = document.getElementById(`${winId}-tabs`);
            if (container && (this as any).tabsComponent) {
                // Clear and append rendered tabs
                container.innerHTML = '';
                const tabsVNode = (this as any).tabsComponent.render();
                const node = (window as any).VDOM.createElement(tabsVNode);
                container.appendChild(node);
                this.bindTabDragHandlers(container);
            }
        } catch (e) {
            console.warn('[FinderUI] onMount tab render failed', e);
        }
    }

    onUpdate(): void {
        // Keep manual tab container in sync during updates to avoid duplication
        try {
            const winId = this.props.windowId;
            const container = document.getElementById(`${winId}-tabs`);
            if (container && (this as any).tabsComponent) {
                container.innerHTML = '';
                const tabsVNode = (this as any).tabsComponent.render();
                const node = (window as any).VDOM.createElement(tabsVNode);
                container.appendChild(node);
                this.bindTabDragHandlers(container);
            }
        } catch (e) {
            console.warn('[FinderUI] onUpdate tab render failed', e);
        }
    }

    private bindTabDragHandlers(container: HTMLElement): void {
        // Note: onTabDetach and onTabMove are both optional, but we still need to bind handlers
        // Ensure global listeners are attached once for desktop drop detection
        if (!globalDragListenersAttached) {
            globalDragListenersAttached = true;
            document.addEventListener('dragover', (e: DragEvent) => {
                if (activeTabDrag) {
                    e.preventDefault();
                }
            });
            document.addEventListener(
                'drop',
                (e: DragEvent) => {
                    if (!activeTabDrag) return;
                    const target = e.target as HTMLElement | null;
                    const droppedOnTabs = target?.closest('.finder-tabs-container');
                    // Only detach when dropping outside any tab bar; tab-bar drops are handled on the container itself
                    if (!droppedOnTabs) {
                        e.preventDefault();
                        e.stopPropagation();
                        activeTabDrag.detach({ x: e.clientX, y: e.clientY });
                        activeTabDrag = null;
                    }
                },
                true
            );
        }

        container.addEventListener('dragover', (e: DragEvent) => {
            if (!activeTabDrag) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            // Visual feedback: highlight container on dragover from different window
            if (activeTabDrag.windowId !== this.props.windowId) {
                container.classList.add(
                    'ring-2',
                    'ring-blue-500',
                    'bg-blue-50/30',
                    'dark:bg-blue-900/20'
                );
            }
        });

        container.addEventListener('dragleave', (e: DragEvent) => {
            if (!activeTabDrag) return;
            const related = e.relatedTarget as HTMLElement;
            if (!container.contains(related)) {
                container.classList.remove(
                    'ring-2',
                    'ring-blue-500',
                    'bg-blue-50/30',
                    'dark:bg-blue-900/20'
                );
            }
        });

        container.addEventListener('drop', (e: DragEvent) => {
            if (!activeTabDrag) return;
            e.preventDefault();
            e.stopPropagation();
            container.classList.remove(
                'ring-2',
                'ring-blue-500',
                'bg-blue-50/30',
                'dark:bg-blue-900/20'
            );
            const targetId = container.id.replace(/-tabs$/, '');
            if (targetId && this.props.onTabMove && targetId !== activeTabDrag.windowId) {
                console.log(`[FinderUI] Moving tab ${activeTabDrag.tabId} to window ${targetId}`);
                this.props.onTabMove(activeTabDrag.tabId, targetId, activeTabDrag.windowId);
            }
            activeTabDrag = null;
        });

        const tabs = Array.from(container.querySelectorAll('.wt-tab')) as HTMLElement[];
        console.log(
            `[FinderUI] Binding drag handlers to ${tabs.length} tab elements in window ${this.props.windowId}`
        );
        tabs.forEach(tabEl => {
            if (tabEl.dataset.finderDndBound === '1') return;
            tabEl.dataset.finderDndBound = '1';
            const tabId = tabEl.dataset.tabId || tabEl.dataset.instanceId;

            tabEl.addEventListener('dragstart', (e: DragEvent) => {
                const resolvedTabId = tabEl.dataset.tabId || tabEl.dataset.instanceId;
                if (!resolvedTabId) {
                    console.warn('[FinderUI] dragstart: no tab ID found on element');
                    return;
                }
                console.log(
                    `[FinderUI] dragstart: tab ${resolvedTabId} from window ${this.props.windowId}`
                );
                activeTabDrag = {
                    tabId: resolvedTabId,
                    windowId: this.props.windowId,
                    detach: pos => this.props.onTabDetach?.(resolvedTabId, pos),
                };
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', resolvedTabId);
                }
                tabEl.classList.add('opacity-50');
            });

            tabEl.addEventListener('dragend', () => {
                if (
                    activeTabDrag &&
                    activeTabDrag.tabId === (tabEl.dataset.tabId || tabEl.dataset.instanceId)
                ) {
                    activeTabDrag = null;
                }
                tabEl.classList.remove('opacity-50');
            });
        });
    }
}
