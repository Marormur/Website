import { h, VNode, diff, patch, createElement } from '../../core/vdom.js';

// ---------------------------------------------------------------------------
// Minimal standalone types (previously imported from MacUI framework)
// ---------------------------------------------------------------------------

export interface TabItem {
    id: string;
    label: string;
    icon?: string;
    closable?: boolean;
    metadata?: unknown;
}

interface SidebarItem {
    id: string;
    label: string;
    icon?: string;
    i18nKey?: string;
    onClick?: (id: string) => void;
}

interface SidebarGroup {
    label: string;
    i18nKey?: string;
    items: SidebarItem[];
}

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

/**
 * FinderUI – standalone UI component for the Finder.
 * Replaces the MacUI BaseComponent-based version with a direct VDOM implementation
 * so the MacUI framework is no longer a dependency.
 */
export class FinderUI {
    protected props: FinderUIProps;
    protected element: HTMLElement | null = null;
    protected container: HTMLElement | null = null;
    protected vTree: VNode | null = null;

    constructor(props: FinderUIProps) {
        this.props = props;
    }

    /** Mount into a container element and return the rendered root. */
    mount(container?: HTMLElement): HTMLElement {
        this.vTree = this.render();
        const dom = createElement(this.vTree);
        if (dom instanceof HTMLElement) {
            this.element = dom;
        } else {
            const wrapper = document.createElement('span');
            wrapper.appendChild(dom);
            this.element = wrapper;
        }
        if (container) {
            this.container = container;
            container.appendChild(this.element);
        }
        this.onMount();
        return this.element;
    }

    /** Re-render and patch the DOM with updated props. */
    update(newProps?: Partial<FinderUIProps>): void {
        if (newProps) {
            this.props = { ...this.props, ...newProps };
        }
        if (!this.element || !this.vTree) return;
        const newVTree = this.render();
        const patches = diff(this.vTree, newVTree);
        patch(this.element, patches);
        this.vTree = newVTree;
        this.onUpdate();
    }

    /** Lifecycle hook called after mount. */
    onMount(): void {
        // Populate manual tab container and set up sidebar resize after initial render
        this._syncTabContainer();
        if (this.element) {
            this._setupSidebarResize(this.element);
        }
    }

    /** Lifecycle hook called after each update. */
    onUpdate(): void {
        // Keep manual tab container in sync during updates
        this._syncTabContainer();
    }

    /** Render the tab bar VNode into the manual tabs container. */
    private _syncTabContainer(): void {
        try {
            const winId = this.props.windowId;
            const container = document.getElementById(`${winId}-tabs`);
            const builder = (this as any)._renderTabsVNode as (() => VNode) | undefined;
            if (container && builder) {
                container.innerHTML = '';
                const tabsVNode = builder();
                const node = createElement(tabsVNode);
                container.appendChild(node);
                this.bindTabDragHandlers(container);
            }
        } catch (e) {
            console.warn('[FinderUI] tab container sync failed', e);
        }
    }

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

        // Toolbar (inlined from former Toolbar component)
        const toolbarClass = `finder-toolbar px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2${this.props.isActive ? '' : ' hidden'}`;
        const toolbarVNode = h(
            'div',
            { className: toolbarClass },
            h(
                'div',
                { className: 'flex items-center gap-1' },
                // Navigation buttons – macOS Segmented Control style
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
                )
            ),
            // Center: breadcrumbs
            h('div', { className: 'flex-1 mx-2 min-w-0' }, renderBreadcrumbs()),
            // Right: view toggle, sort, search
            h(
                'div',
                { className: 'flex items-center gap-2' },
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
                            h('path', {
                                d: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
                            })
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
                )
            )
        );

        // Sidebar (inlined from former Sidebar component)
        console.log(
            `[FinderUI] Rendering tab ${id} (active: ${this.props.isActive}) in window ${windowId}`
        );

        // Store tab VNode builder so lifecycle hooks can imperatively refresh the tab bar
        (this as any)._renderTabsVNode = () =>
            this._buildTabsVNode(tabs, activeTabId, onTabChange, onTabClose, onTabAdd);

        // Sidebar VNode (inlined from former Sidebar component)
        const sidebarVNode = h(
            'aside',
            {
                className:
                    'flex flex-col h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto',
                style: { width: '100%' },
            },
            h(
                'div',
                { className: 'py-2' },
                ...sidebarGroups.map(group =>
                    h(
                        'div',
                        { className: 'mb-4', key: group.label },
                        h(
                            'div',
                            {
                                className:
                                    'px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide',
                                'data-i18n': group.i18nKey,
                            },
                            group.label
                        ),
                        ...group.items.map(item => {
                            const isActive = activeSidebarId === item.id;
                            return h(
                                'button',
                                {
                                    key: item.id,
                                    'data-sidebar-id': item.id,
                                    className: `finder-sidebar-item w-full text-left${isActive ? ' finder-sidebar-active' : ''}`,
                                    onclick: () => item.onClick?.(item.id),
                                },
                                item.icon
                                    ? h('span', { className: 'finder-sidebar-icon' }, item.icon)
                                    : '',
                                h('span', { 'data-i18n': item.i18nKey }, item.label)
                            );
                        })
                    )
                )
            )
        );

        // Full layout (inlined from AppShell + SplitView)
        return h(
            'div',
            {
                className:
                    'flex flex-col h-full w-full overflow-hidden bg-white dark:bg-gray-800 finder-vdom-root',
                'data-testid': 'finder-ui',
            },
            // Toolbar strip
            h('div', { className: 'shrink-0' }, toolbarVNode),
            // Main area
            h(
                'div',
                { className: 'flex-1 flex min-h-0 overflow-hidden' },
                h(
                    'main',
                    { className: 'flex-1 min-w-0 overflow-hidden relative' },
                    // SplitView (sidebar + resizer + content)
                    h(
                        'div',
                        { className: 'flex h-full w-full overflow-hidden flex-row' },
                        h(
                            'div',
                            {
                                className: 'split-view-sidebar shrink-0 overflow-auto',
                                style: { width: `${sidebarWidth}px` },
                            },
                            h(
                                'div',
                                { className: 'split-view-left h-full overflow-auto' },
                                sidebarVNode
                            )
                        ),
                        h('div', {
                            className:
                                'split-view-resizer shrink-0 w-1 cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 transition-colors',
                        }),
                        h(
                            'div',
                            { className: 'flex-1 min-w-0 min-h-0 overflow-auto' },
                            h(
                                'div',
                                {
                                    className:
                                        'split-view-right flex flex-col h-full overflow-hidden',
                                },
                                // Only render Tabs container in the active tab's UI
                                this.props.isActive
                                    ? h('div', {
                                          className: 'finder-tabs-container',
                                          id: `${windowId}-tabs`,
                                          'data-tabs-manual': '1',
                                      })
                                    : h('div', { className: 'finder-tabs-placeholder hidden' }),
                                h(
                                    'div',
                                    { className: 'flex-1 overflow-hidden relative' },
                                    renderContent()
                                )
                            )
                        )
                    )
                )
            )
        );
    }

    /** Build the VNode for the tab bar (previously delegated to MacUI Tabs component). */
    private _buildTabsVNode(
        tabs: TabItem[],
        activeTabId: string,
        onTabChange: (id: string) => void,
        onTabClose: (id: string) => void,
        onTabAdd: () => void
    ): VNode {
        const containerClass =
            `macui-tabs flex items-end gap-1 px-2 border-b border-gray-300 dark:border-gray-700` +
            ' bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm';

        return h(
            'div',
            { className: containerClass },
            ...tabs.map(tab => {
                const isActive = tab.id === activeTabId;
                const tabClass =
                    `macui-tab wt-tab group relative flex items-center gap-2 px-3 py-1.5 text-sm rounded-t-md border border-b-0 transition-all cursor-pointer select-none ` +
                    (isActive
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 z-10 -mb-[1px]'
                        : 'bg-gray-200/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-200 dark:hover:bg-gray-800');
                return h(
                    'div',
                    {
                        className: tabClass,
                        onclick: () => onTabChange(tab.id),
                        draggable: true,
                        'data-tab-id': tab.id,
                        'data-instance-id': tab.id,
                    },
                    tab.icon ? h('span', { className: 'tab-icon' }, tab.icon) : '',
                    h(
                        'span',
                        { className: 'wt-tab-title tab-label truncate max-w-[150px]' },
                        tab.label
                    ),
                    tab.closable !== false
                        ? h(
                              'button',
                              {
                                  className: `wt-tab-close tab-close opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full w-4 h-4 flex items-center justify-center transition-all ${isActive ? 'opacity-60' : ''}`,
                                  onclick: (e: MouseEvent) => {
                                      e.stopPropagation();
                                      onTabClose(tab.id);
                                  },
                              },
                              '×'
                          )
                        : ''
                );
            }),
            h(
                'button',
                {
                    className:
                        'wt-add p-1 mb-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors',
                    onclick: (e: MouseEvent) => {
                        e.stopPropagation();
                        onTabAdd();
                    },
                    title: 'Neuer Tab',
                },
                '+'
            )
        );
    }

    /** Attach imperative mouse-drag logic for the sidebar resizer after mount. */
    private _setupSidebarResize(root: HTMLElement): void {
        const resizer = root.querySelector('.split-view-resizer') as HTMLElement | null;
        const sidebarEl = root.querySelector('.split-view-sidebar') as HTMLElement | null;
        if (!resizer || !sidebarEl) return;

        let startX = 0;
        let startWidth = 0;
        const minSize = 150;
        const maxSize = 400;

        const onMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - startX;
            const newWidth = Math.max(minSize, Math.min(startWidth + delta, maxSize));
            sidebarEl.style.width = `${newWidth}px`;
            this.props.onResize(newWidth);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.classList.remove('select-none');
        };

        resizer.addEventListener('mousedown', (e: MouseEvent) => {
            e.preventDefault();
            startX = e.clientX;
            startWidth = sidebarEl.offsetWidth;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.classList.add('select-none');
        });
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
