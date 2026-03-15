import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../../framework/core/component.js';
import { AppShell } from '../../framework/layout/app-shell.js';
import { Sidebar, SidebarGroup } from '../../framework/navigation/sidebar.js';
import { Toolbar } from '../../framework/navigation/toolbar.js';
import { Tabs, TabItem } from '../../framework/navigation/tabs.js';
import logger from '../../core/logger.js';

export interface FinderUIProps {
    id: string;
    windowId: string;
    isActive: boolean;
    source: string;
    currentPath: string[];
    viewMode: 'list' | 'grid' | 'gallery';
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
    onSetViewMode: (mode: 'list' | 'grid' | 'gallery') => void;
    onSetSort: (by: FinderSortKey) => void;
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

interface FinderUIState {
    isSearchExpanded: boolean;
    collapsedSidebarGroups: string[];
    isSortMenuOpen: boolean;
    isViewMenuOpen: boolean;
}

type FinderViewMenuKey = 'list' | 'grid' | 'columns' | 'gallery';

type FinderViewMenuOption = {
    key: FinderViewMenuKey;
    label: string;
    icon: string;
    dividerAbove?: boolean;
    disabled?: boolean;
    subtitle?: string;
};

type FinderSortKey =
    | 'none'
    | 'name'
    | 'type'
    | 'program'
    | 'lastOpened'
    | 'dateAdded'
    | 'dateModified'
    | 'dateCreated'
    | 'size'
    | 'tags';

type FinderSortMenuOption = {
    key: FinderSortKey;
    label: string;
    dividerAbove?: boolean;
};

const FINDER_SORT_MENU_OPTIONS: FinderSortMenuOption[] = [
    { key: 'none', label: 'Ohne' },
    { key: 'name', label: 'Name', dividerAbove: true },
    { key: 'type', label: 'Art' },
    { key: 'program', label: 'Programm' },
    { key: 'lastOpened', label: 'Zuletzt geöffnet' },
    { key: 'dateAdded', label: 'Hinzugefügt am' },
    { key: 'dateModified', label: 'Änderungsdatum' },
    { key: 'dateCreated', label: 'Erstellungsdatum' },
    { key: 'size', label: 'Größe' },
    { key: 'tags', label: 'Tags' },
];

const FINDER_VIEW_MENU_OPTIONS: FinderViewMenuOption[] = [
    { key: 'list', label: 'Als Liste', icon: '☰' },
    { key: 'grid', label: 'Als grosse Symbole', icon: '⌗' },
    {
        key: 'columns',
        label: 'Als Spalten',
        icon: '▥',
        dividerAbove: true,
        disabled: true,
        subtitle: 'Platzhalter',
    },
    {
        key: 'gallery',
        label: 'Als Galerie',
        icon: '▦',
    },
];

let activeTabDrag: FinderTabDragContext | null = null;
let globalDragListenersAttached = false;

export class FinderUI extends BaseComponent<FinderUIProps, FinderUIState> {
    private resizeHandlersBound = false;
    private sortMenuOverlayEl: HTMLDivElement | null = null;
    private viewMenuOverlayEl: HTMLDivElement | null = null;
    private sidebarResizeState: {
        isResizing: boolean;
        startX: number;
        startWidth: number;
        moved: boolean;
        currentWidth: number;
    } = {
        isResizing: false,
        startX: 0,
        startWidth: 0,
        moved: false,
        currentWidth: 0,
    };

    constructor(props: FinderUIProps) {
        super(props);
        this.state = {
            // Keep search expanded when a search term already exists (e.g. restored views).
            isSearchExpanded: props.searchTerm.length > 0,
            collapsedSidebarGroups: [],
            isSortMenuOpen: false,
            isViewMenuOpen: false,
        };
    }

    private normalizeSortKey(sortBy: string): FinderSortKey {
        const isKnownKey = FINDER_SORT_MENU_OPTIONS.some(option => option.key === sortBy);
        return isKnownKey ? (sortBy as FinderSortKey) : 'name';
    }

    private toggleSortMenu(): void {
        if (this.state.isSortMenuOpen) {
            this.closeSortMenu();
            return;
        }
        this.closeViewMenu();
        this.setState({ isSortMenuOpen: true });

        requestAnimationFrame(() => {
            this.renderSortMenuOverlay();
            this.positionSortMenuOverlay();
        });
    }

    private closeSortMenu(): void {
        if (!this.state.isSortMenuOpen) return;
        this.destroySortMenuOverlay();
        this.setState({ isSortMenuOpen: false });
    }

    private normalizeViewMenuKey(mode: string): FinderViewMenuKey {
        return mode === 'grid' ? 'grid' : mode === 'gallery' ? 'gallery' : 'list';
    }

    private toggleViewMenu(): void {
        if (this.state.isViewMenuOpen) {
            this.closeViewMenu();
            return;
        }
        this.closeSortMenu();
        this.setState({ isViewMenuOpen: true });

        requestAnimationFrame(() => {
            this.renderViewMenuOverlay();
            this.positionViewMenuOverlay();
        });
    }

    private closeViewMenu(): void {
        if (!this.state.isViewMenuOpen) return;
        this.destroyViewMenuOverlay();
        this.setState({ isViewMenuOpen: false });
    }

    private handleViewSelect(viewKey: FinderViewMenuKey): void {
        if (viewKey !== 'list' && viewKey !== 'grid' && viewKey !== 'gallery') return;
        this.props.onSetViewMode(viewKey);
        this.closeViewMenu();
    }

    private handleSortSelect(sortKey: FinderSortKey): void {
        this.props.onSetSort(sortKey);
        this.closeSortMenu();
    }

    private boundDocumentMouseDown = (event: MouseEvent) => {
        if (!this.state.isSortMenuOpen && !this.state.isViewMenuOpen) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-finder-sort-control]')) return;
        if (target?.closest('[data-finder-view-control]')) return;
        if (this.sortMenuOverlayEl?.contains(target || null)) return;
        if (this.viewMenuOverlayEl?.contains(target || null)) return;
        this.closeSortMenu();
        this.closeViewMenu();
    };

    private boundDocumentKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            this.closeSortMenu();
            this.closeViewMenu();
        }
    };

    private boundWindowResize = () => {
        if (this.state.isSortMenuOpen) {
            this.positionSortMenuOverlay();
        }
        if (this.state.isViewMenuOpen) {
            this.positionViewMenuOverlay();
        }
    };

    private renderViewMenuOverlay(): void {
        this.destroyViewMenuOverlay();

        const activeViewKey = this.normalizeViewMenuKey(this.props.viewMode);
        const menu = document.createElement('div');
        menu.className = 'finder-sort-menu finder-sort-menu-overlay finder-view-menu';
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-label', 'Darstellung');
        menu.addEventListener('mousedown', event => event.stopPropagation());

        FINDER_VIEW_MENU_OPTIONS.forEach(option => {
            const item = document.createElement('button');
            item.type = 'button';
            item.setAttribute('role', 'menuitemradio');
            item.setAttribute(
                'aria-checked',
                !option.disabled && activeViewKey === option.key ? 'true' : 'false'
            );
            item.className = `finder-sort-menu-item ${option.dividerAbove ? 'with-divider' : ''} ${option.disabled ? 'is-disabled' : ''}`;

            if (option.disabled) {
                item.disabled = true;
                item.setAttribute('aria-disabled', 'true');
            }

            const check = document.createElement('span');
            check.className = 'finder-sort-menu-check';
            check.setAttribute('aria-hidden', 'true');
            check.textContent = !option.disabled && activeViewKey === option.key ? '✓' : '';

            const content = document.createElement('span');
            content.className = 'finder-sort-menu-content';

            const label = document.createElement('span');
            label.className = 'finder-sort-menu-label';
            label.textContent = `${option.icon} ${option.label}`;

            content.appendChild(label);

            if (option.subtitle) {
                const subtitle = document.createElement('span');
                subtitle.className = 'finder-sort-menu-meta';
                subtitle.textContent = option.subtitle;
                content.appendChild(subtitle);
            }

            item.append(check, content);
            item.addEventListener('click', event => {
                event.stopPropagation();
                if (option.disabled) return;
                this.handleViewSelect(option.key);
            });

            menu.appendChild(item);
        });

        document.body.appendChild(menu);
        this.viewMenuOverlayEl = menu;
    }

    private positionViewMenuOverlay(): void {
        const trigger = this.element?.querySelector(
            '[data-finder-view-trigger]'
        ) as HTMLElement | null;
        if (!trigger || !this.viewMenuOverlayEl) return;

        const viewportPadding = 8;
        const triggerRect = trigger.getBoundingClientRect();
        const menu = this.viewMenuOverlayEl;

        menu.style.left = '0px';
        menu.style.top = '0px';
        menu.style.visibility = 'hidden';

        const menuRect = menu.getBoundingClientRect();
        let left = triggerRect.left;
        let top = triggerRect.bottom + 8;

        if (left + menuRect.width > window.innerWidth - viewportPadding) {
            left = window.innerWidth - menuRect.width - viewportPadding;
        }
        if (left < viewportPadding) {
            left = viewportPadding;
        }

        if (top + menuRect.height > window.innerHeight - viewportPadding) {
            top = Math.max(viewportPadding, triggerRect.top - menuRect.height - 6);
        }

        menu.style.left = `${Math.round(left)}px`;
        menu.style.top = `${Math.round(top)}px`;
        menu.style.visibility = 'visible';
    }

    private destroyViewMenuOverlay(): void {
        if (!this.viewMenuOverlayEl) return;
        this.viewMenuOverlayEl.remove();
        this.viewMenuOverlayEl = null;
    }

    private renderSortMenuOverlay(): void {
        this.destroySortMenuOverlay();

        const activeSortKey = this.normalizeSortKey(this.props.sortBy);
        const menu = document.createElement('div');
        menu.className = 'finder-sort-menu finder-sort-menu-overlay';
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-label', 'Sortierung');
        menu.addEventListener('mousedown', event => event.stopPropagation());

        FINDER_SORT_MENU_OPTIONS.forEach(option => {
            const item = document.createElement('button');
            item.type = 'button';
            item.setAttribute('role', 'menuitemradio');
            item.setAttribute('aria-checked', activeSortKey === option.key ? 'true' : 'false');
            item.className = `finder-sort-menu-item ${option.dividerAbove ? 'with-divider' : ''}`;

            const check = document.createElement('span');
            check.className = 'finder-sort-menu-check';
            check.setAttribute('aria-hidden', 'true');
            check.textContent = activeSortKey === option.key ? '✓' : '';

            const label = document.createElement('span');
            label.className = 'finder-sort-menu-label';
            label.textContent = option.label;

            item.append(check, label);
            item.addEventListener('click', event => {
                event.stopPropagation();
                this.handleSortSelect(option.key);
            });
            menu.appendChild(item);
        });

        document.body.appendChild(menu);
        this.sortMenuOverlayEl = menu;
    }

    private positionSortMenuOverlay(): void {
        const trigger = this.element?.querySelector(
            '[data-finder-sort-trigger]'
        ) as HTMLElement | null;
        if (!trigger || !this.sortMenuOverlayEl) return;

        const viewportPadding = 8;
        const triggerRect = trigger.getBoundingClientRect();
        const menu = this.sortMenuOverlayEl;

        menu.style.left = '0px';
        menu.style.top = '0px';
        menu.style.visibility = 'hidden';

        const menuRect = menu.getBoundingClientRect();
        let left = triggerRect.left;
        let top = triggerRect.bottom + 8;

        if (left + menuRect.width > window.innerWidth - viewportPadding) {
            left = window.innerWidth - menuRect.width - viewportPadding;
        }
        if (left < viewportPadding) {
            left = viewportPadding;
        }

        if (top + menuRect.height > window.innerHeight - viewportPadding) {
            top = Math.max(viewportPadding, triggerRect.top - menuRect.height - 6);
        }

        menu.style.left = `${Math.round(left)}px`;
        menu.style.top = `${Math.round(top)}px`;
        menu.style.visibility = 'visible';
    }

    private destroySortMenuOverlay(): void {
        if (!this.sortMenuOverlayEl) return;
        this.sortMenuOverlayEl.remove();
        this.sortMenuOverlayEl = null;
    }

    private toggleSidebarGroup(groupId: string): void {
        const isCollapsed = this.state.collapsedSidebarGroups.includes(groupId);
        const collapsedSidebarGroups = isCollapsed
            ? this.state.collapsedSidebarGroups.filter(id => id !== groupId)
            : [...this.state.collapsedSidebarGroups, groupId];

        this.setState({ collapsedSidebarGroups });
    }

    private expandSearchField(): void {
        if (this.state.isSearchExpanded) return;

        this.setState({ isSearchExpanded: true });
        requestAnimationFrame(() => {
            const searchInput = this.element?.querySelector(
                '.finder-search'
            ) as HTMLInputElement | null;
            searchInput?.focus();
        });
    }

    private collapseSearchFieldIfEmpty(value: string): void {
        if (value.trim().length > 0) return;
        this.setState({ isSearchExpanded: false });
    }

    private applySidebarWidth(width: number): void {
        if (!this.element) return;

        const sidebarContainer = this.element.querySelector(
            '[data-sidebar-container]'
        ) as HTMLElement | null;
        const sidebarResizer = this.element.querySelector(
            '[data-resize-handle="sidebar"]'
        ) as HTMLElement | null;
        const toolbarWrap = this.element.querySelector(
            '[data-main-toolbar-wrap]'
        ) as HTMLElement | null;
        const contentWrap = this.element.querySelector(
            '[data-main-content-wrap]'
        ) as HTMLElement | null;

        if (sidebarContainer) {
            sidebarContainer.style.width = `${width}px`;
        }
        if (sidebarResizer) {
            sidebarResizer.style.left = `${width - 4}px`;
        }
        if (toolbarWrap) {
            toolbarWrap.style.marginLeft = `${width}px`;
        }
        if (contentWrap) {
            contentWrap.style.marginLeft = `${width}px`;
        }
    }

    private boundSidebarMouseMove = (e: MouseEvent) => {
        if (!this.sidebarResizeState.isResizing) return;

        const delta = e.clientX - this.sidebarResizeState.startX;
        // Ignore micro movement to avoid accidental width changes from regular clicks.
        if (!this.sidebarResizeState.moved && Math.abs(delta) < 3) return;
        this.sidebarResizeState.moved = true;

        const newWidth = Math.max(150, Math.min(400, this.sidebarResizeState.startWidth + delta));
        if (newWidth !== this.sidebarResizeState.currentWidth) {
            this.sidebarResizeState.currentWidth = newWidth;
            this.applySidebarWidth(newWidth);
        }
    };

    private boundSidebarMouseUp = () => {
        if (!this.sidebarResizeState.isResizing) return;

        if (
            this.sidebarResizeState.moved &&
            this.sidebarResizeState.currentWidth !== this.props.sidebarWidth
        ) {
            this.props.onResize(this.sidebarResizeState.currentWidth);
        }

        this.sidebarResizeState.isResizing = false;
        this.sidebarResizeState.moved = false;
        this.sidebarResizeState.currentWidth = 0;
        document.body.classList.remove('select-none');
    };

    private boundSidebarMouseDown = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        const handle = target?.closest('[data-resize-handle="sidebar"]') as HTMLElement | null;
        if (!handle || e.button !== 0) return;

        e.preventDefault();
        e.stopPropagation();
        this.sidebarResizeState.isResizing = true;
        this.sidebarResizeState.startX = e.clientX;
        this.sidebarResizeState.startWidth = this.props.sidebarWidth;
        this.sidebarResizeState.moved = false;
        this.sidebarResizeState.currentWidth = this.props.sidebarWidth;
        document.body.classList.add('select-none');
    };

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
            onGoRoot,
            onSearch,
            onSidebarAction,
            onResize,
            renderContent,
            renderBreadcrumbs,
        } = this.props;
        const activeSortOption =
            FINDER_SORT_MENU_OPTIONS.find(option => option.key === this.normalizeSortKey(sortBy)) ||
            FINDER_SORT_MENU_OPTIONS[1]!;
        const activeViewOption =
            FINDER_VIEW_MENU_OPTIONS.find(
                option => option.key === this.normalizeViewMenuKey(viewMode)
            ) || FINDER_VIEW_MENU_OPTIONS[0]!;

        // Prepare Sidebar Groups
        const sidebarGroups: SidebarGroup[] = [
            {
                id: 'favorites',
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
                id: 'locations',
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

        const currentFolderName =
            currentPath.length > 0
                ? currentPath[currentPath.length - 1]!
                : source === 'github'
                  ? 'GitHub'
                  : source === 'recent'
                    ? 'Zuletzt verwendet'
                    : source === 'starred'
                      ? 'Markiert'
                      : 'Computer';
        const isSearchExpanded = this.state.isSearchExpanded || searchTerm.length > 0;

        // Render Sidebar Groups inline to ensure state updates work correctly
        const renderSidebarGroup = (group: SidebarGroup) => {
            const groupId = group.id || group.label;
            const isCollapsed = this.state.collapsedSidebarGroups.includes(groupId);

            return h(
                'div',
                { className: 'mb-5', key: groupId },
                h(
                    'div',
                    {
                        className:
                            'finder-sidebar-group-header px-3 py-1 mb-1 text-[11px] font-semibold text-gray-500/80 dark:text-gray-400/70 uppercase tracking-wider',
                    },
                    h('span', { 'data-i18n': group.i18nKey }, group.label),
                    h(
                        'button',
                        {
                            type: 'button',
                            className: 'finder-sidebar-group-toggle',
                            title: isCollapsed ? 'Gruppe ausklappen' : 'Gruppe einklappen',
                            'aria-label': isCollapsed ? 'Gruppe ausklappen' : 'Gruppe einklappen',
                            'aria-expanded': String(!isCollapsed),
                            onclick: (e: Event) => {
                                e.preventDefault();
                                e.stopPropagation();
                                this.toggleSidebarGroup(groupId);
                            },
                        },
                        h(
                            'span',
                            {
                                className: `finder-sidebar-group-toggle-icon ${isCollapsed ? 'is-collapsed' : ''}`,
                                'aria-hidden': 'true',
                            },
                            '▾'
                        )
                    )
                ),
                h(
                    'div',
                    {
                        className: `finder-sidebar-group-items ${isCollapsed ? 'is-collapsed' : ''}`,
                    },
                    ...group.items.map(item => {
                        const isActive = activeSidebarId === item.id;
                        const activeClass = isActive ? 'finder-sidebar-active' : '';

                        return h(
                            'button',
                            {
                                key: item.id,
                                'data-sidebar-id': item.id,
                                'data-sidebar-action': item.id,
                                className: `finder-sidebar-item w-full text-left ${activeClass}`,
                                onclick: () => item.onClick?.(item.id),
                            },
                            item.icon
                                ? h('span', { className: 'finder-sidebar-icon' }, item.icon)
                                : '',
                            h('span', { 'data-i18n': item.i18nKey }, item.label)
                        );
                    })
                )
            );
        };

        const sidebarContent = h(
            'aside',
            {
                className: 'flex flex-col h-full overflow-y-auto finder-sidebar-core',
                style: { width: '100%' },
            },
            h(
                'div',
                { className: 'pt-1 pb-3 px-2' },
                ...sidebarGroups.map(group => renderSidebarGroup(group))
            )
        );

        const toolbar = new Toolbar({
            className: this.props.isActive ? 'finder-toolbar' : 'hidden',
            left: [
                h(
                    'div',
                    {
                        className: 'finder-content-nav finder-no-drag',
                    },
                    h(
                        'button',
                        {
                            className: 'finder-content-nav-btn',
                            onclick: canGoBack ? () => onNavigateBack() : undefined,
                            disabled: !canGoBack,
                            'aria-label': 'Zurück',
                            title: 'Zurück',
                            'data-action': 'navigate-back',
                        },
                        '‹'
                    ),
                    h(
                        'button',
                        {
                            className: 'finder-content-nav-btn',
                            onclick: canGoForward ? () => onNavigateForward() : undefined,
                            disabled: !canGoForward,
                            'aria-label': 'Vorwärts',
                            title: 'Vorwärts',
                            'data-action': 'navigate-forward',
                        },
                        '›'
                    )
                ),
            ],
            center: [
                h(
                    'div',
                    {
                        className:
                            'truncate text-sm font-medium text-gray-800 dark:text-gray-100 px-1',
                        title: currentFolderName,
                    },
                    currentFolderName
                ),
            ],
            right: [
                h(
                    'div',
                    {
                        className:
                            'relative flex items-center finder-toolbar-pill-control mr-2 finder-no-drag',
                        'data-finder-view-control': '1',
                        style: { height: '30px' },
                    },
                    h(
                        'button',
                        {
                            className:
                                'finder-view-trigger finder-sort-trigger h-7 px-3 rounded-full text-xs text-gray-700 dark:text-gray-200',
                            type: 'button',
                            'data-finder-view-trigger': '1',
                            title: `Darstellung: ${activeViewOption.label}`,
                            'aria-label': `Darstellung: ${activeViewOption.label}`,
                            'aria-haspopup': 'menu',
                            'aria-expanded': this.state.isViewMenuOpen ? 'true' : 'false',
                            onclick: (event: Event) => {
                                event.stopPropagation();
                                this.toggleViewMenu();
                            },
                        },
                        h(
                            'span',
                            {
                                className: 'finder-sort-trigger-icon',
                                'aria-hidden': 'true',
                            },
                            activeViewOption.icon
                        ),
                        h(
                            'span',
                            {
                                className: 'finder-sort-trigger-caret',
                                'aria-hidden': 'true',
                            },
                            '⌄'
                        )
                    )
                ),
                h(
                    'div',
                    {
                        className:
                            'relative flex items-center finder-toolbar-pill-control mr-2 finder-no-drag',
                        'data-finder-sort-control': '1',
                        style: { height: '30px' },
                    },
                    h(
                        'button',
                        {
                            className:
                                'finder-sort-trigger h-7 px-3 rounded-full text-xs text-gray-700 dark:text-gray-200',
                            type: 'button',
                            'data-finder-sort-trigger': '1',
                            title: `Sortieren: ${activeSortOption.label}`,
                            'aria-label': `Sortieren: ${activeSortOption.label}`,
                            'aria-haspopup': 'menu',
                            'aria-expanded': this.state.isSortMenuOpen ? 'true' : 'false',
                            onclick: (event: Event) => {
                                event.stopPropagation();
                                this.toggleSortMenu();
                            },
                        },
                        h(
                            'span',
                            {
                                className: 'finder-sort-trigger-icon',
                                'aria-hidden': 'true',
                            },
                            '☰'
                        ),
                        h(
                            'span',
                            {
                                className: 'finder-sort-trigger-caret',
                                'aria-hidden': 'true',
                            },
                            '⌄'
                        )
                    )
                ),
                h(
                    'div',
                    {
                        className:
                            'finder-no-drag relative h-8 flex items-center justify-end overflow-hidden shrink-0 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500',
                        style: {
                            height: '30px',
                            width: isSearchExpanded ? '160px' : '30px',
                            transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                        },
                    },
                    h('input', {
                        type: 'text',
                        className: `finder-search finder-no-drag absolute right-0 h-8 w-40 pl-8 pr-3 py-1 text-sm border-0 rounded-full bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none transition-opacity duration-150 ${isSearchExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`,
                        placeholder: 'Suchen',
                        value: searchTerm,
                        style: { height: '30px' },
                        oninput: (e: Event) => onSearch((e.target as HTMLInputElement).value),
                        onblur: (e: Event) =>
                            this.collapseSearchFieldIfEmpty((e.target as HTMLInputElement).value),
                        onkeydown: (e: KeyboardEvent) => {
                            if (e.key !== 'Escape') return;

                            const input = e.target as HTMLInputElement;
                            if (input.value.length > 0) {
                                onSearch('');
                            }

                            this.setState({ isSearchExpanded: false });
                        },
                    }),
                    h(
                        'button',
                        {
                            type: 'button',
                            className: `finder-no-drag absolute right-0 w-8 h-8 rounded-full transition-colors flex items-center justify-center focus:outline-none ${
                                isSearchExpanded
                                    ? 'border border-transparent bg-transparent text-gray-500 dark:text-gray-300 hover:bg-transparent'
                                    : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`,
                            title: 'Suche öffnen',
                            'aria-label': 'Suche öffnen',
                            style: { width: '30px', height: '30px' },
                            onclick: () => this.expandSearchField(),
                        },
                        h(
                            'span',
                            {
                                className:
                                    'text-[16px] leading-none font-bold text-gray-700 dark:text-gray-100',
                                'aria-hidden': 'true',
                            },
                            '⌕'
                        )
                    )
                ),
            ],
        });

        // Tabs Component (macOS style)
        logger.debug(
            'FINDER',
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
            className: 'bg-transparent backdrop-blur-sm',
        });

        // macOS 26 Style: Sidebar über volle Höhe mit Traffic Lights
        const sidebarWithTrafficLights = h(
            'div',
            {
                className: 'absolute top-0 left-0 bottom-0 z-10 flex flex-col',
                style: { width: `${sidebarWidth}px` },
                'data-sidebar-container': '1',
            },
            h(
                'div',
                {
                    className: 'finder-sidebar-panel-shell h-full',
                },
                h(
                    'div',
                    {
                        className: 'finder-sidebar-panel flex flex-col',
                        style: { height: '100%' },
                    },
                    // Traffic Lights (macOS style)
                    h(
                        'div',
                        {
                            className:
                                'finder-window-drag-zone cursor-move flex items-center gap-2 px-3 py-2.5',
                            style: { height: '44px' },
                        },
                        h('div', {
                            className:
                                'finder-no-drag traffic-light-control traffic-light-control--close',
                            title: 'Schließen',
                            'data-action': 'window-close',
                            'data-symbol': '×',
                        }),
                        h('div', {
                            className:
                                'finder-no-drag traffic-light-control traffic-light-control--minimize',
                            title: 'Minimieren',
                            'data-action': 'window-minimize',
                            'data-symbol': '−',
                        }),
                        h('div', {
                            className:
                                'finder-no-drag traffic-light-control traffic-light-control--maximize',
                            title: 'Zoomen',
                            'data-action': 'window-maximize',
                            'data-symbol': '+',
                        })
                    ),
                    // Sidebar Content
                    h('div', { className: 'flex-1 overflow-y-auto' }, sidebarContent)
                )
            )
        );

        // Resizer für Sidebar-Breite
        const sidebarResizer = h('div', {
            className:
                'finder-sidebar-resizer absolute top-0 bottom-0 z-20 w-2 -translate-x-1 cursor-col-resize transition-colors',
            style: { left: `${sidebarWidth - 4}px` },
            'data-resize-handle': 'sidebar',
        });

        // Content Area (ohne SplitView, da Sidebar jetzt absolut positioniert ist)
        const contentArea = h(
            'div',
            { className: 'flex flex-col h-full overflow-hidden' },
            // Only render Tabs in the active tab's UI to avoid duplicates in the DOM
            // This ensures that E2E tests only find one set of tabs per window
            this.props.isActive
                ? h('div', {
                      className: 'finder-tabs-container pt-0 pl-2 pr-2',
                      id: `${windowId}-tabs`,
                      'data-tabs-manual': '1',
                  })
                : h('div', { className: 'finder-tabs-placeholder hidden' }),
            h('div', { className: 'flex-1 overflow-hidden relative' }, renderContent())
        );

        // Toolbar mit Margin für Sidebar
        const toolbarWithMargin = h(
            'div',
            {
                className: 'finder-window-drag-zone cursor-move',
                style: { marginLeft: `${sidebarWidth}px` },
                'data-main-toolbar-wrap': '1',
            },
            toolbar.render()
        );

        const shell = new AppShell({
            toolbar: toolbarWithMargin,
            content: h(
                'div',
                {
                    className: 'relative h-full',
                    style: { marginLeft: `${sidebarWidth}px` },
                    'data-main-content-wrap': '1',
                },
                contentArea
            ),
        });

        const vnode = shell.render();
        vnode.props['data-testid'] = 'finder-ui';
        vnode.props['className'] =
            ((vnode.props['className'] as string) || '') + ' finder-vdom-root';

        // Wrapper mit Sidebar und Resizer
        return h(
            'div',
            { className: 'relative w-full h-full overflow-hidden' },
            sidebarWithTrafficLights,
            sidebarResizer,
            vnode
        );
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
            logger.warn('FINDER', '[FinderUI] onMount tab render failed', e);
        }

        this.bindSidebarResizer();
        document.addEventListener('mousedown', this.boundDocumentMouseDown);
        document.addEventListener('keydown', this.boundDocumentKeyDown);
        window.addEventListener('resize', this.boundWindowResize);
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
            logger.warn('FINDER', '[FinderUI] onUpdate tab render failed', e);
        }

        // Ensure resizer stays functional after VDOM updates.
        this.bindSidebarResizer();

        if (this.state.isSortMenuOpen) {
            this.renderSortMenuOverlay();
            this.positionSortMenuOverlay();
        }
        if (this.state.isViewMenuOpen) {
            this.renderViewMenuOverlay();
            this.positionViewMenuOverlay();
        }
    }

    onUnmount(): void {
        document.removeEventListener('mousedown', this.boundDocumentMouseDown);
        document.removeEventListener('keydown', this.boundDocumentKeyDown);
        window.removeEventListener('resize', this.boundWindowResize);
        this.destroySortMenuOverlay();
        this.destroyViewMenuOverlay();

        if (!this.resizeHandlersBound || !this.element) return;
        this.element.removeEventListener('mousedown', this.boundSidebarMouseDown);
        document.removeEventListener('mousemove', this.boundSidebarMouseMove);
        document.removeEventListener('mouseup', this.boundSidebarMouseUp);
        this.resizeHandlersBound = false;
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
                logger.debug(
                    'FINDER',
                    `[FinderUI] Moving tab ${activeTabDrag.tabId} to window ${targetId}`
                );
                this.props.onTabMove(activeTabDrag.tabId, targetId, activeTabDrag.windowId);
            }
            activeTabDrag = null;
        });

        const tabs = Array.from(container.querySelectorAll('.wt-tab')) as HTMLElement[];
        logger.debug(
            'FINDER',
            `[FinderUI] Binding drag handlers to ${tabs.length} tab elements in window ${this.props.windowId}`
        );
        tabs.forEach(tabEl => {
            if (tabEl.dataset.finderDndBound === '1') return;
            tabEl.dataset.finderDndBound = '1';
            const tabId = tabEl.dataset.tabId || tabEl.dataset.instanceId;

            tabEl.addEventListener('dragstart', (e: DragEvent) => {
                const resolvedTabId = tabEl.dataset.tabId || tabEl.dataset.instanceId;
                if (!resolvedTabId) {
                    logger.warn('FINDER', '[FinderUI] dragstart: no tab ID found on element');
                    return;
                }
                logger.debug(
                    'FINDER',
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

    private bindSidebarResizer(): void {
        if (!this.element || this.resizeHandlersBound) return;

        this.element.addEventListener('mousedown', this.boundSidebarMouseDown);
        document.addEventListener('mousemove', this.boundSidebarMouseMove);
        document.addEventListener('mouseup', this.boundSidebarMouseUp);
        this.resizeHandlersBound = true;
    }
}
