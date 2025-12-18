import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export interface SidebarItem {
    id: string;
    label: string;
    icon?: string;
    i18nKey?: string;
    onClick?: (id: string) => void;
}

export interface SidebarGroup {
    label: string;
    i18nKey?: string;
    items: SidebarItem[];
}

export interface SidebarProps extends ComponentConfig {
    groups: SidebarGroup[];
    activeId?: string;
    onItemClick?: (id: string) => void;
    idPrefix?: string;
}

export class Sidebar extends BaseComponent<SidebarProps> {
    render(): VNode {
        return h(
            'aside',
            {
                className: `flex flex-col h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto ${this.props.className || ''}`,
                style: { width: '100%' }, // Usually controlled by SplitView
            },
            h(
                'div',
                { className: 'py-2' },
                ...this.props.groups.map(group => this.renderGroup(group))
            )
        );
    }

    private renderGroup(group: SidebarGroup): VNode {
        return h(
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
            ...group.items.map(item => this.renderItem(item))
        );
    }

    private renderItem(item: SidebarItem): VNode {
        const isActive = this.props.activeId === item.id;
        const activeClass = isActive ? 'finder-sidebar-active' : '';

        return h(
            'button',
            {
                key: item.id,
                'data-sidebar-id': item.id,
                className: `finder-sidebar-item w-full text-left ${activeClass}`,
                onclick: () => {
                    if (item.onClick) item.onClick(item.id);
                    if (this.props.onItemClick) this.props.onItemClick(item.id);
                },
            },
            item.icon ? h('span', { className: 'finder-sidebar-icon' }, item.icon) : '',
            h('span', { 'data-i18n': item.i18nKey }, item.label)
        );
    }
}
