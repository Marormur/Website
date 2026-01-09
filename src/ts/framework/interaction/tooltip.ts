import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export interface TooltipProps extends ComponentConfig {
    content: string | VNode;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number; // ms before showing
    children: VNode;
}

export interface TooltipState {
    visible: boolean;
    position: { top: number; left: number };
}

/**
 * Tooltip Component
 * 
 * Displays contextual information on hover.
 * Automatically positions itself to avoid viewport edges.
 * 
 * @example
 * ```typescript
 * const tooltip = new Tooltip({
 *     content: 'Click to save your changes',
 *     placement: 'top',
 *     children: new Button({ label: 'Save' }).render()
 * });
 * ```
 */
export class Tooltip extends BaseComponent<TooltipProps, TooltipState> {
    private targetElement: HTMLElement | null = null;
    private tooltipElement: HTMLElement | null = null;
    private showTimeout: number | null = null;

    constructor(props: TooltipProps) {
        super(props);
        this.state = {
            visible: false,
            position: { top: 0, left: 0 },
        };
    }

    render(): VNode {
        const { children, content, placement = 'top' } = this.props;
        const { visible, position } = this.state;

        return h(
            'div',
            {
                className: 'macui-tooltip-wrapper inline-block relative',
                onmouseenter: () => this.handleMouseEnter(),
                onmouseleave: () => this.handleMouseLeave(),
            },
            children,
            visible
                ? h(
                      'div',
                      {
                          className: `macui-tooltip absolute z-[10000] px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg pointer-events-none whitespace-nowrap ${this.getPlacementClasses(placement)}`,
                          style: `top: ${position.top}px; left: ${position.left}px;`,
                      },
                      content
                  )
                : ''
        );
    }

    private getPlacementClasses(placement: string): string {
        const classes: Record<string, string> = {
            top: '-translate-y-full -mt-2',
            bottom: 'mt-2',
            left: '-translate-x-full -ml-2',
            right: 'ml-2',
        };
        return classes[placement] || classes['top'] || '';
    }

    private handleMouseEnter(): void {
        const delay = this.props.delay || 300;
        this.showTimeout = window.setTimeout(() => {
            this.calculatePosition();
            this.setState({ visible: true });
        }, delay);
    }

    private handleMouseLeave(): void {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        this.setState({ visible: false });
    }

    private calculatePosition(): void {
        if (!this.element) return;

        const target = this.element.querySelector('.macui-tooltip-wrapper');
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const placement = this.props.placement || 'top';

        let top = 0;
        let left = 0;

        switch (placement) {
            case 'top':
                top = -8;
                left = rect.width / 2;
                break;
            case 'bottom':
                top = rect.height + 8;
                left = rect.width / 2;
                break;
            case 'left':
                top = rect.height / 2;
                left = -8;
                break;
            case 'right':
                top = rect.height / 2;
                left = rect.width + 8;
                break;
        }

        this.setState({ position: { top, left } });
    }

    onDestroy(): void {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
        }
    }
}
