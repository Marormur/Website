import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';
import { Button } from '../controls/button.js';

export interface EmptyStateProps extends ComponentConfig {
    icon?: string;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

/**
 * EmptyState Component
 *
 * Display when there is no data to show, with optional action button.
 *
 * @example
 * ```typescript
 * const emptyState = new EmptyState({
 *     icon: '📂',
 *     title: 'No files found',
 *     description: 'This repository is empty or search returned no results.',
 *     action: {
 *         label: 'Reset filters',
 *         onClick: () => this.resetFilters()
 *     }
 * });
 * ```
 */
export class EmptyState extends BaseComponent<EmptyStateProps> {
    render(): VNode {
        const { icon = '📭', title, description, action } = this.props;

        return h(
            'div',
            {
                className:
                    'macui-empty-state flex flex-col items-center justify-center p-8 text-center min-h-[300px]',
            },
            h('div', { className: 'text-6xl mb-4' }, icon),
            h(
                'h3',
                { className: 'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2' },
                title
            ),
            description
                ? h(
                      'p',
                      {
                          className: 'text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md',
                      },
                      description
                  )
                : '',
            action
                ? new Button({
                      label: action.label,
                      variant: 'primary',
                      onClick: action.onClick,
                  }).render()
                : ''
        );
    }
}
