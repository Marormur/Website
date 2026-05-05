import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export interface SidebarItem {
    id: string;
    label: string;
    icon?: string;
    i18nKey?: string;
    /** Optional badge (count or label) shown on the right side of the item. */
    badge?: string | number;
    /** When true the item is rendered as disabled (grayed out, not interactive). */
    disabled?: boolean;
    onClick?: (id: string) => void;
}

export interface SidebarGroup {
    id?: string;
    label: string;
    i18nKey?: string;
    items: SidebarItem[];
    /**
     * When false the group header collapse-toggle is not rendered.
     * Defaults to true (toggle shown whenever `onToggleGroup` is provided).
     */
    collapsible?: boolean;
}

export interface SidebarProps extends ComponentConfig {
    groups: SidebarGroup[];
    activeId?: string;
    onItemClick?: (id: string) => void;
    collapsedGroupIds?: string[];
    onToggleGroup?: (groupId: string) => void;
    idPrefix?: string;
}

export class Sidebar extends BaseComponent<SidebarProps> {
    render(): VNode {
        return h(
            'aside',
            {
                className: `flex flex-col h-full bg-gray-50/80 dark:bg-gray-900/95 border-r border-gray-200/60 dark:border-gray-700/50 overflow-y-auto ${this.props.className || ''}`,
                style: { width: '100%' },
            },
            h(
                'div',
                { className: 'py-3 px-2' },
                ...this.props.groups.map(group => this.renderGroup(group))
            )
        );
    }

    private renderGroup(group: SidebarGroup): VNode {
        const groupId = group.id || group.label;
        const isCollapsed = !!this.props.collapsedGroupIds?.includes(groupId);
        // Show toggle only when the group is collapsible and a toggle handler is provided.
        const showToggle = group.collapsible !== false && !!this.props.onToggleGroup;

        return h(
            'div',
            { className: 'mb-5', key: groupId },
            h(
                'div',
                {
                    className:
                        'app-sidebar-group-header px-3 py-1 mb-1 text-[11px] font-semibold text-gray-500/80 dark:text-gray-400/70 uppercase tracking-wider',
                },
                h('span', { 'data-i18n': group.i18nKey }, group.label),
                showToggle
                    ? h(
                          'button',
                          {
                              type: 'button',
                              className: 'app-sidebar-group-toggle',
                              title: isCollapsed ? 'Gruppe ausklappen' : 'Gruppe einklappen',
                              'aria-label': isCollapsed
                                  ? 'Gruppe ausklappen'
                                  : 'Gruppe einklappen',
                              'aria-expanded': String(!isCollapsed),
                              onclick: (e: Event) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  this.props.onToggleGroup?.(groupId);
                              },
                          },
                          h(
                              'span',
                              {
                                  className: `app-sidebar-group-toggle-icon ${isCollapsed ? 'is-collapsed' : ''}`,
                                  'aria-hidden': 'true',
                              },
                              '▾'
                          )
                      )
                    : ''
            ),
            ...(isCollapsed ? [] : group.items.map(item => this.renderItem(item)))
        );
    }

    private renderItem(item: SidebarItem): VNode {
        const isActive = this.props.activeId === item.id;
        const activeClass = isActive ? 'app-sidebar-item--active' : '';

        return h(
            'button',
            {
                key: item.id,
                'data-sidebar-id': item.id,
                'data-sidebar-action': item.id,
                className: `app-sidebar-item w-full text-left ${activeClass}`,
                disabled: item.disabled || false,
                'aria-disabled': item.disabled ? 'true' : undefined,
                onclick: () => {
                    if (item.disabled) return;
                    if (item.onClick) item.onClick(item.id);
                    if (this.props.onItemClick) this.props.onItemClick(item.id);
                },
            },
            item.icon ? h('span', { className: 'app-sidebar-item-icon' }, item.icon) : '',
            h('span', { 'data-i18n': item.i18nKey }, item.label),
            item.badge !== undefined
                ? h('span', { className: 'app-sidebar-item-badge' }, String(item.badge))
                : ''
        );
    }
}
