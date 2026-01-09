import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export interface ButtonProps extends ComponentConfig {
    label: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    icon?: string;
    iconPosition?: 'left' | 'right';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    onClick?: (e: MouseEvent) => void;
}

/**
 * Button Component
 *
 * A reusable button component with support for variants, sizes, icons, and loading states.
 *
 * @example
 * ```typescript
 * const saveButton = new Button({
 *     label: 'Save',
 *     variant: 'primary',
 *     icon: '💾',
 *     onClick: () => this.save()
 * });
 * ```
 */
export class Button extends BaseComponent<ButtonProps> {
    render(): VNode {
        const {
            label,
            variant = 'primary',
            size = 'medium',
            icon,
            iconPosition = 'left',
            disabled = false,
            loading = false,
            fullWidth = false,
            onClick,
        } = this.props;

        const baseClasses =
            'macui-button inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';

        const variantClasses = {
            primary:
                'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500 active:bg-blue-700',
            secondary:
                'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:ring-gray-500',
            danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 active:bg-red-700',
            ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 focus:ring-gray-400',
        };

        const sizeClasses = {
            small: 'px-2 py-1 text-xs',
            medium: 'px-4 py-2 text-sm',
            large: 'px-6 py-3 text-base',
        };

        const disabledClasses =
            disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
        const widthClasses = fullWidth ? 'w-full' : '';

        const className =
            `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${widthClasses}`.trim();

        return h(
            'button',
            {
                className,
                disabled: disabled || loading,
                onclick: !disabled && !loading ? onClick : undefined,
                'data-variant': variant,
                'data-size': size,
            },
            loading ? h('span', { className: 'animate-spin' }, '⟳') : '',
            icon && iconPosition === 'left' ? h('span', { className: 'button-icon' }, icon) : '',
            h('span', {}, label),
            icon && iconPosition === 'right' ? h('span', { className: 'button-icon' }, icon) : ''
        );
    }
}
