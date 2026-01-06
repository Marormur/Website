import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps extends ComponentConfig {
    type: ToastType;
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    onDismiss: () => void;
}

/**
 * Toast Component
 *
 * A notification component for displaying temporary messages.
 * Usually managed by ToastManager, not used directly.
 */
export class Toast extends BaseComponent<ToastProps> {
    render(): VNode {
        const { type, message, action, onDismiss } = this.props;

        const icons: Record<ToastType, string> = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
        };

        const colors: Record<ToastType, string> = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500',
        };

        return h(
            'div',
            {
                className: `macui-toast ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slide-in`,
                'data-type': type,
            },
            h('span', { className: 'text-xl' }, icons[type]),
            h('span', { className: 'flex-1' }, message),
            action
                ? h(
                      'button',
                      {
                          className: 'underline hover:no-underline font-semibold',
                          onclick: () => {
                              action.onClick();
                              onDismiss();
                          },
                      },
                      action.label
                  )
                : '',
            h(
                'button',
                {
                    className: 'ml-2 hover:bg-white/20 rounded p-1 transition-colors',
                    onclick: () => onDismiss(),
                    'aria-label': 'Close',
                },
                '✕'
            )
        );
    }
}
