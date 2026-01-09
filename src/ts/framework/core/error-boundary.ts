import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from './component.js';
import { ComponentConfig } from './types.js';

interface ErrorBoundaryProps extends ComponentConfig {
    fallback?: (error: Error) => VNode;
    onError?: (error: Error, errorInfo: string) => void;
    children: VNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary Component
 *
 * Catches errors in child components and displays a fallback UI.
 * Prevents entire app crash from component-level errors.
 *
 * @example
 * ```typescript
 * const app = new ErrorBoundary({
 *     onError: (error) => {
 *         console.error('Component Error:', error);
 *         API.toast?.error('An error occurred');
 *     },
 *     children: new MyApp({ ... }).render()
 * });
 * ```
 */
export class ErrorBoundary extends BaseComponent<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    render(): VNode {
        if (this.state.hasError && this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error);
            }
            return this.defaultFallback(this.state.error);
        }

        return this.props.children;
    }

    private defaultFallback(error: Error): VNode {
        return h(
            'div',
            {
                className:
                    'macui-error-boundary p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg',
            },
            h(
                'h3',
                { className: 'text-red-800 dark:text-red-200 font-semibold mb-2' },
                '⚠️ Component Error'
            ),
            h('p', { className: 'text-red-700 dark:text-red-300 text-sm mb-2' }, error.message),
            h(
                'button',
                {
                    className:
                        'text-sm underline text-red-600 dark:text-red-400 hover:no-underline',
                    onclick: () => this.reset(),
                },
                'Try again'
            )
        );
    }

    private reset(): void {
        this.setState({ hasError: false, error: null });
    }

    /**
     * Override update to catch errors during rendering
     */
    update(newProps?: Partial<ErrorBoundaryProps>): void {
        try {
            super.update(newProps);
        } catch (error) {
            this.handleError(error as Error);
        }
    }

    /**
     * Handle errors from child components
     */
    private handleError(error: Error): void {
        this.setState({ hasError: true, error });
        this.props.onError?.(error, error.stack || '');

        // Log to global error handler if available
        const win = window as typeof window & {
            ErrorHandler?: {
                handleError: (error: Error, context: { context: string }) => void;
            };
        };
        if (win.ErrorHandler) {
            win.ErrorHandler.handleError(error, { context: 'ErrorBoundary' });
        }
    }

    /**
     * Override mount to catch errors during initial render
     */
    mount(container?: HTMLElement): HTMLElement {
        try {
            return super.mount(container);
        } catch (error) {
            this.handleError(error as Error);
            // Re-render with error state
            this.vTree = this.render();
            const win = window as typeof window & {
                VDOM?: {
                    createElement: (vnode: VNode) => Node;
                };
            };
            const dom = win.VDOM?.createElement(this.vTree) || document.createElement('div');
            if (dom instanceof HTMLElement) {
                this.element = dom;
            } else {
                const wrapper = document.createElement('span');
                wrapper.appendChild(dom);
                this.element = wrapper;
            }
            if (container) {
                this.container = container;
                container.appendChild(this.element);
            }
            return this.element;
        }
    }
}
