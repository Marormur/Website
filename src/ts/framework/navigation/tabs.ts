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
        const isDarkTheme =
            typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

        const containerClass = isMacos
            ? `macui-tabs flex w-full items-center gap-1 px-1.5 py-0.5 rounded-full border border-gray-300 dark:border-gray-600 ${className || ''}`
            : `macui-tabs-pills flex items-center gap-1 p-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg ${className || ''}`;
        const containerProps: Record<string, unknown> = { className: containerClass };
        if (id) {
            containerProps.id = id;
        }
        if (isMacos && isDarkTheme) {
            containerProps.style = {
                backgroundColor: 'rgba(30, 41, 59, 0.78)',
                borderColor: 'rgba(71, 85, 105, 0.75)',
            };
        }

        return h(
            'div',
            containerProps,
            ...(isMacos
                ? [
                      h(
                          'div',
                          { className: 'wt-tab-strip flex flex-1 min-w-0 items-end gap-1 mr-2' },
                          ...tabs.map(tab =>
                              this.renderTab(tab, tab.id === activeTabId, variant, isDarkTheme)
                          )
                      ),
                  ]
                : tabs.map(tab =>
                      this.renderTab(tab, tab.id === activeTabId, variant, isDarkTheme)
                  )),
            showAddButton
                ? h(
                      'button',
                      {
                          className: isMacos
                              ? 'wt-add ml-auto mr-0.5 w-7 h-7 shrink-0 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center leading-none'
                              : 'wt-add p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-all shadow-sm',
                          ...(isMacos ? { style: { width: '28px', height: '28px' } } : {}),
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

    private renderTab(
        tab: TabItem,
        isActive: boolean,
        variant: 'macos' | 'pills',
        isDarkTheme: boolean
    ): VNode {
        const { onTabChange, onTabClose } = this.props;
        const isMacos = variant === 'macos';

        let tabClass = '';
        if (isMacos) {
            tabClass = `macui-tab wt-tab group relative flex flex-1 basis-0 min-w-0 items-center justify-center px-2.5 py-1 text-[13px] rounded-full border transition-all cursor-pointer select-none ${
                isActive
                    ? 'bg-white text-gray-900 border-gray-300 shadow-sm dark:!bg-gray-700/60 dark:text-gray-100 dark:border-gray-500/90'
                    : 'bg-gray-200/40 text-gray-600 border-transparent hover:bg-white/50 dark:!bg-gray-900/30 dark:text-gray-300 dark:hover:bg-gray-800/55'
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
                ...(isMacos && isDarkTheme
                    ? {
                          style: isActive
                              ? {
                                    backgroundColor: 'rgba(71, 85, 105, 0.62)',
                                    color: 'rgb(243, 244, 246)',
                                    borderColor: 'rgba(100, 116, 139, 0.9)',
                                }
                              : {
                                    backgroundColor: 'rgba(15, 23, 42, 0.28)',
                                    color: 'rgb(203, 213, 225)',
                                    borderColor: 'transparent',
                                },
                      }
                    : {}),
                onclick: () => onTabChange(tab.id),
                draggable: true,
                'data-tab-id': tab.id,
                'data-instance-id': tab.id, // Compatibility with E2E tests
            },
            h(
                'span',
                {
                    className: `wt-tab-title tab-label block w-full truncate text-center ${
                        isMacos && tab.closable !== false ? 'pr-4' : ''
                    }`,
                },
                tab.label
            ),
            tab.closable !== false
                ? h(
                      'button',
                      {
                          className: `wt-tab-close tab-close hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full w-4 h-4 flex items-center justify-center transition-all ${
                              isMacos
                                  ? `absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 ${isActive ? 'opacity-60' : ''}`
                                  : `${isActive ? 'opacity-60' : ''}`
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
