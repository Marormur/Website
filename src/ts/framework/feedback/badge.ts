import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export interface BadgeProps extends ComponentConfig {
    content: string | number;
    variant?: 'primary' | 'success' | 'warning' | 'danger';
    size?: 'small' | 'medium';
    dot?: boolean; // Only dot, no text
}

/**
 * Badge Component
 *
 * Small status indicators for notification counts or status dots.
 *
 * @example
 * ```typescript
 * // Notification count
 * const badge = new Badge({ content: 5, variant: 'danger' });
 *
 * // Status dot
 * const statusDot = new Badge({ dot: true, variant: 'success' });
 * ```
 */
export class Badge extends BaseComponent<BadgeProps> {
    render(): VNode {
        const { content, variant = 'primary', size = 'medium', dot = false } = this.props;

        const colors: Record<string, string> = {
            primary: 'bg-blue-500',
            success: 'bg-green-500',
            warning: 'bg-yellow-500',
            danger: 'bg-red-500',
        };

        const sizes = {
            small: 'text-[10px] px-1.5 py-0.5 min-w-[16px]',
            medium: 'text-xs px-2 py-1 min-w-[20px]',
        };

        if (dot) {
            return h('span', {
                className: `macui-badge-dot inline-block w-2 h-2 rounded-full ${colors[variant]}`,
                'data-variant': variant,
            });
        }

        return h(
            'span',
            {
                className: `macui-badge inline-flex items-center justify-center rounded-full text-white font-semibold ${colors[variant]} ${sizes[size]}`,
                'data-variant': variant,
                'data-size': size,
            },
            String(content)
        );
    }
}
