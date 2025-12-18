import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

/**
 * TabItem - Definition eines einzelnen Tabs
 */
export interface TabItem {
    id: string;
    label: string;
    icon?: string;
    closable?: boolean;
    metadata?: any;
}

/**
 * TabsProps - Konfiguration für die Tabs-Komponente
 */
export interface TabsProps extends ComponentConfig {
    id?: string;
    tabs: TabItem[];
    activeTabId: string;
    onTabChange: (id: string) => void;
    onTabClose?: (id: string) => void;
    onTabAdd?: () => void;
    onTabReorder?: (newOrder: string[]) => void;
    className?: string;
    showAddButton?: boolean;
    /** Optionaler Style-Modus: 'macos' (default) oder 'pills' */
    variant?: 'macos' | 'pills';
}

/**
 * Tabs - Eine wiederverwendbare Tab-Leiste im MacUI Framework.
 * Unterstützt verschiedene Varianten, Schließen von Tabs und Hinzufügen neuer Tabs.
 */
export class Tabs extends BaseComponent<TabsProps> {
    render(): VNode {
        const {
            id,
            tabs,
            activeTabId,
            onTabAdd,
            className,
            showAddButton,
            variant = 'macos',
        } = this.props;

        const isMacos = variant === 'macos';

        const containerClass = isMacos
            ? `macui-tabs flex items-end gap-1 px-2 border-b border-gray-300 dark:border-gray-700 ${className || ''}`
            : `macui-tabs-pills flex items-center gap-1 p-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg ${className || ''}`;

        return h(
            'div',
            { id, className: containerClass },
            ...tabs.map(tab => this.renderTab(tab, tab.id === activeTabId, variant)),
            showAddButton
                ? h(
                      'button',
                      {
                          className: isMacos
                              ? 'wt-add p-1 mb-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors'
                              : 'wt-add p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-all shadow-sm',
                          onclick: (e: MouseEvent) => {
                              e.stopPropagation();
                              onTabAdd?.();
                          },
                          title: 'Neuer Tab',
                      },
                      '+'
                  )
                : ''
        );
    }

    private renderTab(tab: TabItem, isActive: boolean, variant: 'macos' | 'pills'): VNode {
        const { onTabChange, onTabClose } = this.props;
        const isMacos = variant === 'macos';

        let tabClass = '';
        if (isMacos) {
            tabClass = `macui-tab wt-tab group relative flex items-center gap-2 px-3 py-1.5 text-sm rounded-t-md border border-b-0 transition-all cursor-pointer select-none ${
                isActive
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 z-10 -mb-[1px]'
                    : 'bg-gray-200/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-200 dark:hover:bg-gray-800'
            }`;
        } else {
            tabClass = `macui-tab-pill wt-tab group relative flex items-center gap-2 px-4 py-1.5 text-sm rounded-md transition-all cursor-pointer select-none ${
                isActive
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`;
        }

        return h(
            'div',
            {
                className: tabClass,
                onclick: () => onTabChange(tab.id),
                draggable: true,
                'data-tab-id': tab.id,
                'data-instance-id': tab.id, // Compatibility with E2E tests
            },
            tab.icon ? h('span', { className: 'tab-icon' }, tab.icon) : '',
            h('span', { className: 'wt-tab-title tab-label truncate max-w-[150px]' }, tab.label),
            tab.closable !== false
                ? h(
                      'button',
                      {
                          className: `wt-tab-close tab-close opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full w-4 h-4 flex items-center justify-center transition-all ${
                              isActive ? 'opacity-60' : ''
                          }`,
                          onclick: (e: MouseEvent) => {
                              e.stopPropagation();
                              onTabClose?.(tab.id);
                          },
                      },
                      '×'
                  )
                : ''
        );
    }
}
