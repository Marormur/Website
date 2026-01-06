import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export interface InputProps extends ComponentConfig {
    type?: 'text' | 'password' | 'email' | 'number' | 'search';
    placeholder?: string;
    value?: string;
    disabled?: boolean;
    error?: string;
    helperText?: string;
    prefix?: VNode | string;
    suffix?: VNode | string;
    onInput?: (value: string) => void;
    onChange?: (value: string) => void;
    onEnter?: () => void;
}

export interface InputState {
    value: string;
}

/**
 * Input Component
 *
 * A reusable input field with support for validation, error states, and prefix/suffix icons.
 *
 * @example
 * ```typescript
 * const searchInput = new Input({
 *     type: 'search',
 *     placeholder: 'Search...',
 *     prefix: '🔍',
 *     onInput: (value) => this.handleSearch(value)
 * });
 * ```
 */
export class Input extends BaseComponent<InputProps, InputState> {
    constructor(props: InputProps) {
        super(props);
        this.state = { value: props.value || '' };
    }

    render(): VNode {
        const {
            type = 'text',
            placeholder,
            disabled,
            error,
            helperText,
            prefix,
            suffix,
        } = this.props;

        const hasError = !!error;
        const borderColor = hasError
            ? 'border-red-500 focus-within:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus-within:ring-blue-500';

        return h(
            'div',
            { className: 'macui-input-wrapper w-full' },
            h(
                'div',
                {
                    className: `macui-input-container flex items-center gap-2 px-3 py-2 border ${borderColor} rounded-lg bg-white dark:bg-gray-800 transition-all focus-within:ring-2`,
                },
                prefix ? h('div', { className: 'macui-input-prefix text-gray-500' }, prefix) : '',
                h('input', {
                    type,
                    className:
                        'flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500',
                    placeholder,
                    value: this.state.value,
                    disabled,
                    oninput: (e: Event) => this.handleInput(e),
                    onchange: (e: Event) => this.handleChange(e),
                    onkeydown: (e: KeyboardEvent) => this.handleKeyDown(e),
                }),
                suffix ? h('div', { className: 'macui-input-suffix text-gray-500' }, suffix) : ''
            ),
            error
                ? h('p', { className: 'macui-input-error text-xs text-red-500 mt-1' }, error)
                : helperText
                  ? h(
                        'p',
                        {
                            className:
                                'macui-input-helper text-xs text-gray-500 dark:text-gray-400 mt-1',
                        },
                        helperText
                    )
                  : ''
        );
    }

    private handleInput(e: Event): void {
        const value = (e.target as HTMLInputElement).value;
        this.setState({ value });
        this.props.onInput?.(value);
    }

    private handleChange(e: Event): void {
        const value = (e.target as HTMLInputElement).value;
        this.props.onChange?.(value);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Enter') {
            this.props.onEnter?.();
        }
    }

    /**
     * Get the current input value
     */
    getValue(): string {
        return this.state.value;
    }

    /**
     * Set the input value programmatically
     */
    setValue(value: string): void {
        this.setState({ value });
    }
}
